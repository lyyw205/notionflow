import { Hono } from "hono";
import pagesRoutes from "./routes/pages";
import filesRoutes from "./routes/files";
import aiCallbackRoutes from "./routes/ai-callback";
import reportsRoutes from "./routes/reports";
import sseRoutes from "./routes/sse";
import searchRoutes from "./routes/search";
import projectsRoutes from "./routes/projects";
import databasesRoutes from "./routes/databases";

const app = new Hono().basePath("/api");

app.route("/pages", pagesRoutes);
app.route("/files", filesRoutes);
app.route("/ai", aiCallbackRoutes);
app.route("/reports", reportsRoutes);
app.route("/sse", sseRoutes);
app.route("/search", searchRoutes);
app.route("/projects", projectsRoutes);
app.route("/databases", databasesRoutes);

export default app;
