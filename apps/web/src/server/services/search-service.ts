import { db } from "@/lib/db";
import { pages, categories, pageTags, tags, embeddings } from "@/lib/db/schema";
import { eq, desc, sql } from "drizzle-orm";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

interface SearchResult {
  id: string;
  title: string;
  summary: string | null;
  snippet: string;
  score: number;
  category: { id: string; name: string } | null;
  tags: { id: string; name: string }[];
  updatedAt: number;
}

/**
 * FTS5 keyword search using BM25 ranking.
 * Falls back to LIKE search if FTS5 table doesn't exist.
 */
export async function keywordSearch(
  query: string,
  limit = 20,
  offset = 0
): Promise<SearchResult[]> {
  try {
    const ftsResults = db.all<{ id: string; rank: number }>(
      sql`SELECT p.id, rank FROM pages_fts fts
          JOIN pages p ON p.rowid = fts.rowid
          WHERE pages_fts MATCH ${query}
          ORDER BY rank
          LIMIT ${limit} OFFSET ${offset}`
    );

    if (ftsResults.length > 0) {
      return enrichResults(
        ftsResults.map((r) => ({ id: r.id, score: -r.rank })),
        query
      );
    }
  } catch {
    // FTS5 not available, fall back to LIKE
  }

  const likeResults = db
    .select()
    .from(pages)
    .where(sql`${pages.plainText} LIKE ${"%" + query + "%"}`)
    .orderBy(desc(pages.updatedAt))
    .limit(limit)
    .offset(offset)
    .all();

  return enrichResults(
    likeResults.map((p) => ({ id: p.id, score: 1.0 })),
    query
  );
}

/**
 * Semantic search using embeddings cosine similarity.
 */
export async function semanticSearch(
  query: string,
  limit = 20
): Promise<SearchResult[]> {
  // Get query embedding from AI service
  let queryVector: number[];
  try {
    const res = await fetch(`${AI_SERVICE_URL}/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: query }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    queryVector = data.vector;
  } catch {
    return [];
  }

  // Load all embeddings and compute cosine similarity
  const allEmbeddings = db.select().from(embeddings).all();
  const scored: { id: string; score: number }[] = [];

  for (const row of allEmbeddings) {
    const buf = Buffer.from(row.vector as ArrayBuffer);
    const floats = new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4);
    const sim = cosineSimilarity(queryVector, Array.from(floats));
    scored.push({ id: row.pageId, score: sim });
  }

  scored.sort((a, b) => b.score - a.score);
  const topResults = scored.slice(0, limit);

  return enrichResults(topResults, query);
}

/**
 * Hybrid search combining FTS5 + vector using RRF (Reciprocal Rank Fusion).
 */
export async function hybridSearch(
  query: string,
  limit = 20,
  offset = 0
): Promise<SearchResult[]> {
  const k = 60; // RRF constant

  const [keywordResults, vectorResults] = await Promise.all([
    keywordSearch(query, 50, 0),
    semanticSearch(query, 50),
  ]);

  // Build rank maps
  const keywordRank = new Map<string, number>();
  keywordResults.forEach((r, i) => keywordRank.set(r.id, i + 1));

  const vectorRank = new Map<string, number>();
  vectorResults.forEach((r, i) => vectorRank.set(r.id, i + 1));

  // Collect all unique page IDs
  const allIdsArr = Array.from(keywordRank.keys()).concat(Array.from(vectorRank.keys()));
  const seenIds = new Set<string>();

  // Compute RRF scores with recency boost
  const pageMap = new Map<string, number>();
  for (const r of [...keywordResults, ...vectorResults]) {
    pageMap.set(r.id, r.updatedAt);
  }

  const rrfScored: { id: string; score: number; updatedAt: number }[] = [];

  for (const id of allIdsArr) {
    if (seenIds.has(id)) continue;
    seenIds.add(id);
    const kRank = keywordRank.get(id);
    const vRank = vectorRank.get(id);

    let score = 0;
    if (kRank) score += 1 / (k + kRank);
    if (vRank) score += 1 / (k + vRank);

    // Recency boost
    const updatedAt = pageMap.get(id) || 0;
    const daysSince =
      (Date.now() / 1000 - updatedAt) / 86400;
    const recencyBoost = 1 / (1 + daysSince * 0.01);
    score *= 1 + 0.1 * recencyBoost;

    rrfScored.push({ id, score, updatedAt });
  }

  rrfScored.sort((a, b) => b.score - a.score);
  const paged = rrfScored.slice(offset, offset + limit);

  return enrichResults(
    paged.map((r) => ({ id: r.id, score: r.score })),
    query
  );
}

// --- Helpers ---

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

function generateSnippet(text: string, query: string, maxLen = 200): string {
  const lower = text.toLowerCase();
  const qLower = query.toLowerCase();
  const idx = lower.indexOf(qLower);

  if (idx === -1) {
    return text.slice(0, maxLen) + (text.length > maxLen ? "..." : "");
  }

  const start = Math.max(0, idx - 60);
  const end = Math.min(text.length, idx + query.length + 140);
  let snippet = text.slice(start, end);

  if (start > 0) snippet = "..." + snippet;
  if (end < text.length) snippet += "...";

  return snippet;
}

async function enrichResults(
  scored: { id: string; score: number }[],
  query: string
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  for (const { id, score } of scored) {
    const page = db.select().from(pages).where(eq(pages.id, id)).get();
    if (!page) continue;

    const category = page.categoryId
      ? db
          .select()
          .from(categories)
          .where(eq(categories.id, page.categoryId))
          .get()
      : null;

    const pageTagRows = db
      .select()
      .from(pageTags)
      .innerJoin(tags, eq(pageTags.tagId, tags.id))
      .where(eq(pageTags.pageId, id))
      .all();

    results.push({
      id: page.id,
      title: page.title,
      summary: page.summary,
      snippet: generateSnippet(page.plainText, query),
      score,
      category: category ? { id: category.id, name: category.name } : null,
      tags: pageTagRows.map((row) => ({
        id: row.tags.id,
        name: row.tags.name,
      })),
      updatedAt: page.updatedAt,
    });
  }

  return results;
}
