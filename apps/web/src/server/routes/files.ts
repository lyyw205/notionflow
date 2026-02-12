import { Hono } from "hono";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";

const app = new Hono();

const UPLOADS_DIR = path.resolve("./uploads");

app.post("/", async (c) => {
  const formData = await c.req.formData();
  const file = formData.get("file") as File | null;
  const pageId = formData.get("pageId") as string | null;
  const uploadedBy = formData.get("uploadedBy") as string | null;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  if (!uploadedBy) {
    return c.json({ error: "uploadedBy is required" }, 400);
  }

  const id = randomUUID();
  const ext = path.extname(file.name);
  const storageName = `${id}${ext}`;
  const storagePath = path.join(UPLOADS_DIR, storageName);

  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  fs.writeFileSync(storagePath, buffer);

  const now = Math.floor(Date.now() / 1000);

  db.insert(files)
    .values({
      id,
      filename: file.name,
      storagePath: storageName,
      mimeType: file.type || "application/octet-stream",
      size: buffer.length,
      pageId: pageId || null,
      uploadedBy,
      createdAt: now,
    })
    .run();

  return c.json(
    {
      id,
      filename: file.name,
      mimeType: file.type,
      size: buffer.length,
    },
    201
  );
});

app.get("/:id", async (c) => {
  const id = c.req.param("id");
  const fileRecord = db.select().from(files).where(eq(files.id, id)).get();

  if (!fileRecord) {
    return c.json({ error: "File not found" }, 404);
  }

  const filePath = path.join(UPLOADS_DIR, fileRecord.storagePath);

  if (!fs.existsSync(filePath)) {
    return c.json({ error: "File not found on disk" }, 404);
  }

  const buffer = fs.readFileSync(filePath);
  return new Response(buffer, {
    headers: {
      "Content-Type": fileRecord.mimeType,
      "Content-Disposition": `inline; filename="${fileRecord.filename}"`,
      "Content-Length": String(fileRecord.size),
    },
  });
});

export default app;
