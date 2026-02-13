import { db } from "@/lib/db";
import {
  databases,
  databaseProperties,
  databaseRecords,
  databaseViews,
} from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { randomUUID } from "crypto";

// === Database CRUD ===

export async function createDatabase(params: {
  pageId: string;
  createdBy: string;
  name?: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();

  db.insert(databases)
    .values({
      id,
      name: params.name || "제목 없는 데이터베이스",
      pageId: params.pageId,
      createdBy: params.createdBy,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  // Create default "제목" title property
  const titlePropId = randomUUID();
  db.insert(databaseProperties)
    .values({
      id: titlePropId,
      databaseId: id,
      name: "제목",
      type: "text",
      sortOrder: 0,
      isTitle: 1,
      createdAt: now,
    })
    .run();

  // Create default table view
  const viewId = randomUUID();
  db.insert(databaseViews)
    .values({
      id: viewId,
      databaseId: id,
      name: "Table",
      type: "table",
      config: JSON.stringify({}),
      sortOrder: 0,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return getDatabase(id);
}

export async function getDatabase(id: string) {
  const database = db
    .select()
    .from(databases)
    .where(eq(databases.id, id))
    .get();
  if (!database) return null;

  const properties = db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, id))
    .orderBy(asc(databaseProperties.sortOrder))
    .all();

  const records = db
    .select()
    .from(databaseRecords)
    .where(eq(databaseRecords.databaseId, id))
    .orderBy(asc(databaseRecords.sortOrder))
    .all();

  const views = db
    .select()
    .from(databaseViews)
    .where(eq(databaseViews.databaseId, id))
    .orderBy(asc(databaseViews.sortOrder))
    .all();

  return {
    ...database,
    properties: properties.map((p) => ({
      ...p,
      config: p.config ? JSON.parse(p.config) : null,
    })),
    records: records.map((r) => ({
      ...r,
      values: JSON.parse(r.values),
    })),
    views: views.map((v) => ({
      ...v,
      config: v.config ? JSON.parse(v.config) : null,
    })),
  };
}

export async function updateDatabase(
  id: string,
  params: { name?: string; description?: string }
) {
  const existing = db
    .select()
    .from(databases)
    .where(eq(databases.id, id))
    .get();
  if (!existing) return null;

  const now = Math.floor(Date.now() / 1000);
  db.update(databases)
    .set({
      name: params.name ?? existing.name,
      description: params.description ?? existing.description,
      updatedAt: now,
    })
    .where(eq(databases.id, id))
    .run();

  return getDatabase(id);
}

export async function deleteDatabase(id: string) {
  const existing = db
    .select()
    .from(databases)
    .where(eq(databases.id, id))
    .get();
  if (!existing) return false;

  // Cascade delete
  db.delete(databaseViews)
    .where(eq(databaseViews.databaseId, id))
    .run();
  db.delete(databaseRecords)
    .where(eq(databaseRecords.databaseId, id))
    .run();
  db.delete(databaseProperties)
    .where(eq(databaseProperties.databaseId, id))
    .run();
  db.delete(databases).where(eq(databases.id, id)).run();

  return true;
}

export async function deleteDatabasesByPageId(pageId: string) {
  const dbs = db
    .select()
    .from(databases)
    .where(eq(databases.pageId, pageId))
    .all();

  for (const dbRow of dbs) {
    await deleteDatabase(dbRow.id);
  }
}

// === Property CRUD ===

export async function createProperty(params: {
  databaseId: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
}) {
  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();

  // Get max sortOrder
  const maxSort = db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databaseId, params.databaseId))
    .orderBy(asc(databaseProperties.sortOrder))
    .all();

  const sortOrder =
    maxSort.length > 0 ? maxSort[maxSort.length - 1].sortOrder + 1 : 0;

  db.insert(databaseProperties)
    .values({
      id,
      databaseId: params.databaseId,
      name: params.name,
      type: params.type,
      config: params.config ? JSON.stringify(params.config) : null,
      sortOrder,
      isTitle: 0,
      createdAt: now,
    })
    .run();

  return {
    id,
    databaseId: params.databaseId,
    name: params.name,
    type: params.type,
    config: params.config || null,
    sortOrder,
    isTitle: 0,
    createdAt: now,
  };
}

export async function updateProperty(
  id: string,
  params: {
    name?: string;
    type?: string;
    config?: Record<string, unknown>;
    sortOrder?: number;
  }
) {
  const existing = db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.id, id))
    .get();
  if (!existing) return null;

  db.update(databaseProperties)
    .set({
      name: params.name ?? existing.name,
      type: params.type ?? existing.type,
      config:
        params.config !== undefined
          ? JSON.stringify(params.config)
          : existing.config,
      sortOrder: params.sortOrder ?? existing.sortOrder,
    })
    .where(eq(databaseProperties.id, id))
    .run();

  const updated = db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.id, id))
    .get();

  return updated
    ? {
        ...updated,
        config: updated.config ? JSON.parse(updated.config) : null,
      }
    : null;
}

export async function deleteProperty(id: string) {
  const existing = db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.id, id))
    .get();
  if (!existing) return false;

  // Remove this property's key from all records' values
  const records = db
    .select()
    .from(databaseRecords)
    .where(eq(databaseRecords.databaseId, existing.databaseId))
    .all();

  for (const record of records) {
    const values = JSON.parse(record.values);
    delete values[id];
    db.update(databaseRecords)
      .set({ values: JSON.stringify(values) })
      .where(eq(databaseRecords.id, record.id))
      .run();
  }

  db.delete(databaseProperties)
    .where(eq(databaseProperties.id, id))
    .run();

  return true;
}

// === Record CRUD ===

export async function createRecord(params: {
  databaseId: string;
  values?: Record<string, unknown>;
}) {
  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();

  const maxSort = db
    .select()
    .from(databaseRecords)
    .where(eq(databaseRecords.databaseId, params.databaseId))
    .orderBy(asc(databaseRecords.sortOrder))
    .all();

  const sortOrder =
    maxSort.length > 0 ? maxSort[maxSort.length - 1].sortOrder + 1 : 0;

  db.insert(databaseRecords)
    .values({
      id,
      databaseId: params.databaseId,
      values: JSON.stringify(params.values || {}),
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return {
    id,
    databaseId: params.databaseId,
    values: params.values || {},
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateRecord(
  id: string,
  params: { values?: Record<string, unknown>; sortOrder?: number }
) {
  const existing = db
    .select()
    .from(databaseRecords)
    .where(eq(databaseRecords.id, id))
    .get();
  if (!existing) return null;

  const now = Math.floor(Date.now() / 1000);
  const existingValues = JSON.parse(existing.values);
  const mergedValues = params.values
    ? { ...existingValues, ...params.values }
    : existingValues;

  db.update(databaseRecords)
    .set({
      values: JSON.stringify(mergedValues),
      sortOrder: params.sortOrder ?? existing.sortOrder,
      updatedAt: now,
    })
    .where(eq(databaseRecords.id, id))
    .run();

  return {
    id,
    databaseId: existing.databaseId,
    values: mergedValues,
    sortOrder: params.sortOrder ?? existing.sortOrder,
    createdAt: existing.createdAt,
    updatedAt: now,
  };
}

export async function deleteRecord(id: string) {
  const existing = db
    .select()
    .from(databaseRecords)
    .where(eq(databaseRecords.id, id))
    .get();
  if (!existing) return false;

  db.delete(databaseRecords).where(eq(databaseRecords.id, id)).run();
  return true;
}

// === View CRUD ===

export async function createView(params: {
  databaseId: string;
  name: string;
  type: string;
  config?: Record<string, unknown>;
}) {
  const now = Math.floor(Date.now() / 1000);
  const id = randomUUID();

  const maxSort = db
    .select()
    .from(databaseViews)
    .where(eq(databaseViews.databaseId, params.databaseId))
    .orderBy(asc(databaseViews.sortOrder))
    .all();

  const sortOrder =
    maxSort.length > 0 ? maxSort[maxSort.length - 1].sortOrder + 1 : 0;

  db.insert(databaseViews)
    .values({
      id,
      databaseId: params.databaseId,
      name: params.name,
      type: params.type,
      config: params.config ? JSON.stringify(params.config) : null,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  return {
    id,
    databaseId: params.databaseId,
    name: params.name,
    type: params.type,
    config: params.config || null,
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };
}

export async function updateView(
  id: string,
  params: {
    name?: string;
    type?: string;
    config?: Record<string, unknown>;
    sortOrder?: number;
  }
) {
  const existing = db
    .select()
    .from(databaseViews)
    .where(eq(databaseViews.id, id))
    .get();
  if (!existing) return null;

  const now = Math.floor(Date.now() / 1000);
  db.update(databaseViews)
    .set({
      name: params.name ?? existing.name,
      type: params.type ?? existing.type,
      config:
        params.config !== undefined
          ? JSON.stringify(params.config)
          : existing.config,
      sortOrder: params.sortOrder ?? existing.sortOrder,
      updatedAt: now,
    })
    .where(eq(databaseViews.id, id))
    .run();

  const updated = db
    .select()
    .from(databaseViews)
    .where(eq(databaseViews.id, id))
    .get();

  return updated
    ? {
        ...updated,
        config: updated.config ? JSON.parse(updated.config) : null,
      }
    : null;
}

export async function deleteView(id: string) {
  const existing = db
    .select()
    .from(databaseViews)
    .where(eq(databaseViews.id, id))
    .get();
  if (!existing) return false;

  db.delete(databaseViews).where(eq(databaseViews.id, id)).run();
  return true;
}
