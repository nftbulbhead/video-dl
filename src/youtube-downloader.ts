import path from "path";
import { stat } from "fs/promises";
import { v4 as uuidv4 } from "uuid";
import type { DownloadResult } from "./downloader";

const VALID_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
];

export function isYoutubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return VALID_HOSTS.includes(parsed.hostname);
  } catch {
    return false;
  }
}

export function validateYoutubeUrl(url: string): { parsed: URL; videoId: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!VALID_HOSTS.includes(parsed.hostname)) {
    throw new Error("URL must be from youtube.com or youtu.be");
  }

  let videoId: string | null = null;

  // youtu.be/VIDEO_ID
  if (parsed.hostname.includes("youtu.be")) {
    videoId = parsed.pathname.slice(1).split("/")[0] || null;
  }
  // youtube.com/watch?v=VIDEO_ID
  else if (parsed.pathname === "/watch") {
    videoId = parsed.searchParams.get("v");
  }
  // youtube.com/shorts/VIDEO_ID
  else if (parsed.pathname.startsWith("/shorts/")) {
    videoId = parsed.pathname.split("/")[2] || null;
  }
  // youtube.com/embed/VIDEO_ID
  else if (parsed.pathname.startsWith("/embed/")) {
    videoId = parsed.pathname.split("/")[2] || null;
  }
  // youtube.com/v/VIDEO_ID
  else if (parsed.pathname.startsWith("/v/")) {
    videoId = parsed.pathname.split("/")[2] || null;
  }

  if (!videoId) throw new Error("Could not find video ID in YouTube URL");
  return { parsed, videoId };
}

export async function downloadYoutubeVideo(url: string, outputDir: string): Promise<DownloadResult> {
  const { videoId } = validateYoutubeUrl(url);
  const filename = `${videoId}.mp4`;
  const filepath = path.join(outputDir, filename);

  const proc = Bun.spawn([
    "yt-dlp",
    "-f", "b[ext=mp4]/bv*[ext=mp4]",
    "-o", filepath,
    "--no-playlist",
    "--no-overwrites",
    url,
  ], {
    stdout: "pipe",
    stderr: "pipe",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    const stderr = await new Response(proc.stderr).text();
    throw new Error(`yt-dlp failed (exit ${exitCode}): ${stderr.slice(0, 500)}`);
  }

  const info = await stat(filepath);
  return { id: videoId, filename, filepath, size: info.size };
}
