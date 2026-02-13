# Twitter Video Downloader — Product Plan

## Vision
A clean, fast tool to download videos from Twitter/X posts. Start simple, do one thing well.

## MVP Scope (v0.1)
- **Input:** Twitter/X post URL (e.g. `https://x.com/user/status/123456`)
- **Output:** Direct video file download (best available quality)
- **Interface:** 
  1. CLI tool (`twdl <url>`)
  2. HTTP API endpoint (`POST /download` with `{url}`)
  3. Simple web UI (paste link, get video)

## Technical Approach
- **Runtime:** Node.js/Bun (matches our existing stack)
- **Video extraction:** Parse Twitter's API/embed pages to extract .m3u8 or .mp4 URLs
  - Option A: Use `yt-dlp` as a subprocess (battle-tested, supports Twitter)
  - Option B: Direct Twitter guest API calls (no dependencies, but fragile)
  - **Recommendation:** Start with yt-dlp wrapper for reliability, add direct extraction later
- **Server:** Express/Hono for the API
- **Web UI:** Single HTML page, minimal JS, no framework needed

## Architecture
```
┌─────────────┐     ┌──────────────┐     ┌──────────┐
│  Web UI     │────▶│  API Server  │────▶│  yt-dlp  │
│  (HTML/JS)  │     │  (Hono/Bun)  │     │  (exec)  │
└─────────────┘     └──────────────┘     └──────────┘
                           │
                    ┌──────┴──────┐
                    │  /downloads │
                    │  (temp dir) │
                    └─────────────┘
```

## API Design
```
POST /api/download
Body: { "url": "https://x.com/user/status/123" }
Response: { "id": "abc123", "status": "processing" }

GET /api/download/:id
Response: { "status": "ready", "filename": "video.mp4", "size": 12345 }

GET /api/download/:id/file
Response: video file stream
```

## File Structure
```
twitter-video-dl/
├── package.json
├── src/
│   ├── index.ts          # Entry point, starts server
│   ├── server.ts         # HTTP API routes
│   ├── downloader.ts     # yt-dlp wrapper logic
│   └── cli.ts            # CLI interface
├── public/
│   └── index.html        # Web UI
├── downloads/            # Temp storage (auto-cleanup)
└── README.md
```

## Agent Delegation Plan
1. **Agent 1 — Backend:** Build server.ts + downloader.ts (API + yt-dlp integration)
2. **Agent 2 — Frontend:** Build the web UI (public/index.html)
3. **Agent 3 — CLI:** Build cli.ts
4. **Agent 4 — Integration & Testing:** Wire everything together, test end-to-end

## Success Criteria
- Paste a Twitter URL → get the video file
- Works with tweets containing single videos, GIFs, and multi-video posts
- Clean error handling (private tweets, deleted posts, invalid URLs)
- Response time < 10s for typical videos

## Future (post-MVP)
- Quality selection (720p, 1080p, etc.)
- x402 paid endpoint
- Support for more platforms (Instagram, TikTok, etc.)
- Thumbnail extraction
- Batch downloads
```
