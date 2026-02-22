-- FTS5 virtual table for full-text search on pages
-- Drizzle can't generate virtual tables, so this is a manual migration

CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
  title,
  plain_text,
  content='pages',
  content_rowid='rowid'
);
--> statement-breakpoint
-- Populate FTS index from existing data
INSERT INTO pages_fts(rowid, title, plain_text)
  SELECT rowid, title, plain_text FROM pages;
--> statement-breakpoint
-- Triggers to keep FTS index in sync with pages table

CREATE TRIGGER pages_fts_insert AFTER INSERT ON pages BEGIN
  INSERT INTO pages_fts(rowid, title, plain_text)
  VALUES (new.rowid, new.title, new.plain_text);
END;
--> statement-breakpoint
CREATE TRIGGER pages_fts_delete AFTER DELETE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, title, plain_text)
  VALUES ('delete', old.rowid, old.title, old.plain_text);
END;
--> statement-breakpoint
CREATE TRIGGER pages_fts_update AFTER UPDATE ON pages BEGIN
  INSERT INTO pages_fts(pages_fts, rowid, title, plain_text)
  VALUES ('delete', old.rowid, old.title, old.plain_text);
  INSERT INTO pages_fts(rowid, title, plain_text)
  VALUES (new.rowid, new.title, new.plain_text);
END;
