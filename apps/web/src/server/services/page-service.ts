import { db } from "@/lib/db";
import {
  pages,
  pageVersions,
  pageTags,
  tags,
  categories,
  projects,
  milestones,
} from "@/lib/db/schema";
import { eq, desc, like } from "drizzle-orm";
import { randomUUID } from "crypto";
import { deleteDatabasesByPageId } from "./database-service";

interface BlockNoteBlock {
  type?: string;
  content?: Array<{ type?: string; text?: string; content?: BlockNoteBlock[] }>;
  children?: BlockNoteBlock[];
}

function extractPlainText(contentJson: string): string {
  try {
    const blocks: BlockNoteBlock[] = JSON.parse(contentJson);
    return extractTextFromBlocks(blocks);
  } catch {
    return "";
  }
}

function extractTextFromBlocks(blocks: BlockNoteBlock[]): string {
  const lines: string[] = [];

  for (const block of blocks) {
    if (block.content && Array.isArray(block.content)) {
      const lineText = block.content
        .map((inline) => {
          if (inline.text) return inline.text;
          if (inline.content) return extractTextFromBlocks(inline.content as BlockNoteBlock[]);
          return "";
        })
        .join("");
      if (lineText) lines.push(lineText);
    }

    if (block.children && Array.isArray(block.children)) {
      const childText = extractTextFromBlocks(block.children);
      if (childText) lines.push(childText);
    }
  }

  return lines.join("\n");
}

export async function createPage(params: {
  title: string;
  content: string;
  authorId: string;
  categoryId?: string;
  projectId?: string;
  milestoneId?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();
  const plainText = extractPlainText(params.content);

  db.insert(pages)
    .values({
      id,
      title: params.title,
      content: params.content,
      plainText,
      categoryId: params.categoryId || null,
      projectId: params.projectId || null,
      milestoneId: params.milestoneId || null,
      authorId: params.authorId,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(pageVersions)
    .values({
      id: randomUUID(),
      pageId: id,
      version: 1,
      content: params.content,
      plainText,
      createdAt: now,
    })
    .run();

  return getPage(id);
}

export async function updatePage(
  id: string,
  params: {
    title?: string;
    content?: string;
    categoryId?: string | null;
    projectId?: string | null;
    milestoneId?: string | null;
  }
) {
  const existing = db.select().from(pages).where(eq(pages.id, id)).get();
  if (!existing) return null;

  const now = Math.floor(Date.now() / 1000);
  const content = params.content ?? existing.content;
  const plainText = params.content
    ? extractPlainText(params.content)
    : existing.plainText;

  db.update(pages)
    .set({
      title: params.title ?? existing.title,
      content,
      plainText,
      categoryId:
        params.categoryId !== undefined
          ? params.categoryId
          : existing.categoryId,
      projectId:
        params.projectId !== undefined
          ? params.projectId
          : existing.projectId,
      milestoneId:
        params.milestoneId !== undefined
          ? params.milestoneId
          : existing.milestoneId,
      updatedAt: now,
    })
    .where(eq(pages.id, id))
    .run();

  // Create version entry
  const latestVersion = db
    .select()
    .from(pageVersions)
    .where(eq(pageVersions.pageId, id))
    .orderBy(desc(pageVersions.version))
    .get();

  const nextVersion = (latestVersion?.version ?? 0) + 1;

  db.insert(pageVersions)
    .values({
      id: randomUUID(),
      pageId: id,
      version: nextVersion,
      content,
      plainText,
      createdAt: now,
    })
    .run();

  return { ...(await getPage(id)), plainText };
}

export async function deletePage(id: string) {
  const existing = db.select().from(pages).where(eq(pages.id, id)).get();
  if (!existing) return false;

  // Delete related databases (cascade)
  await deleteDatabasesByPageId(id);

  // Delete related records
  db.delete(pageTags).where(eq(pageTags.pageId, id)).run();
  db.delete(pageVersions).where(eq(pageVersions.pageId, id)).run();
  db.delete(pages).where(eq(pages.id, id)).run();

  return true;
}

export async function getPage(id: string) {
  const page = db.select().from(pages).where(eq(pages.id, id)).get();
  if (!page) return null;

  const category = page.categoryId
    ? db
        .select()
        .from(categories)
        .where(eq(categories.id, page.categoryId))
        .get()
    : null;

  const project = page.projectId
    ? db
        .select()
        .from(projects)
        .where(eq(projects.id, page.projectId))
        .get()
    : null;

  const milestone = page.milestoneId
    ? db
        .select()
        .from(milestones)
        .where(eq(milestones.id, page.milestoneId))
        .get()
    : null;

  const pageTagRows = db
    .select()
    .from(pageTags)
    .innerJoin(tags, eq(pageTags.tagId, tags.id))
    .where(eq(pageTags.pageId, id))
    .all();

  return {
    ...page,
    category: category ? { id: category.id, name: category.name } : null,
    project: project ? { id: project.id, name: project.name } : null,
    milestone: milestone ? { id: milestone.id, title: milestone.title } : null,
    tags: pageTagRows.map((row) => ({
      id: row.tags.id,
      name: row.tags.name,
      confidence: row.page_tags.confidence,
      source: row.page_tags.source,
    })),
  };
}

export async function listPages(categoryId?: string) {
  let query = db.select().from(pages);

  const allPages = categoryId
    ? query.where(eq(pages.categoryId, categoryId)).orderBy(desc(pages.updatedAt)).all()
    : query.orderBy(desc(pages.updatedAt)).all();

  const results = [];
  for (const page of allPages) {
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
      .where(eq(pageTags.pageId, page.id))
      .all();

    results.push({
      id: page.id,
      title: page.title,
      summary: page.summary,
      category: category ? { id: category.id, name: category.name } : null,
      tags: pageTagRows.map((row) => ({
        id: row.tags.id,
        name: row.tags.name,
        confidence: row.page_tags.confidence,
        source: row.page_tags.source,
      })),
      updatedAt: page.updatedAt,
    });
  }

  return results;
}

export { extractPlainText };
