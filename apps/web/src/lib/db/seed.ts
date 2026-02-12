import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { hashSync } from "bcryptjs";
import { randomUUID } from "crypto";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "./data/notionflow.db";
const resolvedPath = path.resolve(dbPath);

fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });

const sqlite = new Database(resolvedPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    is_auto_generated INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    plain_text TEXT NOT NULL,
    summary TEXT,
    category_id TEXT REFERENCES categories(id),
    author_id TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS page_versions (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id),
    version INTEGER NOT NULL,
    content TEXT NOT NULL,
    plain_text TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS tags (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE
  );

  CREATE TABLE IF NOT EXISTS page_tags (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL REFERENCES pages(id),
    tag_id TEXT NOT NULL REFERENCES tags(id),
    confidence REAL NOT NULL,
    source TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS embeddings (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL UNIQUE REFERENCES pages(id),
    vector BLOB NOT NULL,
    cluster_id INTEGER
  );

  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    period_start INTEGER NOT NULL,
    period_end INTEGER NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    page_id TEXT REFERENCES pages(id),
    uploaded_by TEXT NOT NULL REFERENCES users(id),
    created_at INTEGER NOT NULL
  );
`);

const db = drizzle(sqlite, { schema });

const existingAdmin = db
  .select()
  .from(schema.users)
  .where(eq(schema.users.email, "admin@notionflow.local"))
  .get();

if (!existingAdmin) {
  const passwordHash = hashSync("admin123", 10);
  db.insert(schema.users)
    .values({
      id: randomUUID(),
      email: "admin@notionflow.local",
      name: "Admin",
      passwordHash,
      role: "admin",
      createdAt: Math.floor(Date.now() / 1000),
    })
    .run();
  console.log("Seeded admin user: admin@notionflow.local / admin123");
} else {
  console.log("Admin user already exists, skipping seed.");
}

sqlite.close();
console.log("Seed complete.");
