import { app } from "./server";

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

const port = 3456;

export default {
  port,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};

console.log(`Video Downloader API running on http://localhost:${port}`);
