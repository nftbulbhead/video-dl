import { Hono } from "hono";
import { serveStatic } from "hono/bun";
import { v4 as uuidv4 } from "uuid";
import { downloadVideo } from "./downloader";
import { isYoutubeUrl, downloadYoutubeVideo } from "./youtube-downloader";
import { unlink, stat, readdir } from "fs/promises";
import path from "path";

const DOWNLOADS_DIR = path.resolve(import.meta.dir, "../downloads");
const PUBLIC_DIR = path.resolve(import.meta.dir, "../public");
const CLEANUP_INTERVAL = 10 * 60 * 1000; // 10 min
const MAX_AGE = 60 * 60 * 1000; // 1 hour

interface Job {
  id: string;
  status: "processing" | "ready" | "error";
  url: string;
  filename?: string;
  filepath?: string;
  size?: number;
  videoId?: string;
  error?: string;
  createdAt: number;
}

const jobs = new Map<string, Job>();

export const app = new Hono();

// API routes
app.post("/api/download", async (c) => {
  const body = await c.req.json().catch(() => null);
  if (!body?.url) return c.json({ error: "url is required" }, 400);

  const id = uuidv4();
  const job: Job = { id, status: "processing", url: body.url, createdAt: Date.now() };
  jobs.set(id, job);

  // Fire and forget - route to the right downloader
  const download = isYoutubeUrl(body.url)
    ? downloadYoutubeVideo(body.url, DOWNLOADS_DIR)
    : downloadVideo(body.url, DOWNLOADS_DIR);

  download
    .then((result) => {
      job.status = "ready";
      job.filename = result.filename;
      job.filepath = result.filepath;
      job.size = result.size;
      job.videoId = result.id;
    })
    .catch((err) => {
      job.status = "error";
      job.error = err.message;
    });

  return c.json({ id, status: "processing" });
});

app.get("/api/download/:id", (c) => {
  const job = jobs.get(c.req.param("id"));
  if (!job) return c.json({ error: "Job not found" }, 404);

  const { id, status, filename, size, videoId, error } = job;
  return c.json({ id, status, ...(filename && { filename, size, videoId }), ...(error && { error }) });
});

app.get("/api/download/:id/file", async (c) => {
  const job = jobs.get(c.req.param("id"));
  if (!job) return c.json({ error: "Job not found" }, 404);
  if (job.status !== "ready" || !job.filepath) return c.json({ error: "File not ready" }, 400);

  const file = Bun.file(job.filepath);
  if (!(await file.exists())) return c.json({ error: "File missing" }, 404);

  c.header("Content-Type", file.type || "video/mp4");
  c.header("Content-Disposition", `attachment; filename="${job.filename}"`);
  c.header("Content-Length", String(file.size));
  return c.body(file.stream());
});

// Static files
app.use("/*", serveStatic({ root: "./public" }));

// Cleanup old files
async function cleanup() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > MAX_AGE) {
      if (job.filepath) {
        await unlink(job.filepath).catch(() => {});
      }
      jobs.delete(id);
    }
  }
}

setInterval(cleanup, CLEANUP_INTERVAL);
