#!/usr/bin/env bun
import { downloadVideo } from "./downloader";
import path from "path";

const url = process.argv[2];
if (!url) {
  console.error("Usage: twdl <twitter-url>");
  console.error("Example: twdl https://x.com/user/status/123456");
  process.exit(1);
}

const outputDir = process.argv[3] || process.cwd();

console.log(`🐦 Downloading video from: ${url}`);
try {
  const result = await downloadVideo(url, outputDir);
  console.log(`✅ Downloaded: ${result.filename} (${(result.size / 1024 / 1024).toFixed(1)} MB)`);
  console.log(`📁 Saved to: ${path.resolve(result.filepath)}`);
} catch (err: any) {
  console.error(`❌ Error: ${err.message}`);
  process.exit(1);
}
