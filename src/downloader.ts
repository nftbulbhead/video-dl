import path from "path";
import { writeFile, stat } from "fs/promises";

export interface DownloadResult {
  id: string;
  filename: string;
  filepath: string;
  size: number;
}

const VALID_HOSTS = ["twitter.com", "www.twitter.com", "x.com", "www.x.com", "mobile.twitter.com"];
const BEARER = "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA";
const GRAPHQL_ENDPOINT = "https://x.com/i/api/graphql/2ICDjqPd81tulZcYrtpTuQ/TweetResultByRestId";

export function validateUrl(url: string): { parsed: URL; tweetId: string } {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!VALID_HOSTS.includes(parsed.hostname)) {
    throw new Error("URL must be from twitter.com or x.com");
  }
  const match = parsed.pathname.match(/\/status\/(\d+)/);
  if (!match) throw new Error("Could not find tweet ID in URL");
  return { parsed, tweetId: match[1] };
}

async function getGuestToken(): Promise<string> {
  const resp = await fetch("https://api.x.com/1.1/guest/activate.json", {
    method: "POST",
    headers: { Authorization: BEARER },
  });
  if (!resp.ok) throw new Error(`Failed to get guest token: ${resp.status}`);
  const data = (await resp.json()) as any;
  return data.guest_token;
}

async function getTweetData(tweetId: string, guestToken: string): Promise<any> {
  const variables = {
    tweetId,
    withCommunity: false,
    includePromotedContent: false,
    withVoice: false,
  };
  const features = {
    creator_subscriptions_tweet_preview_api_enabled: true,
    tweetypie_unmention_optimization_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: false,
    tweet_awards_web_tipping_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    responsive_web_media_download_video_enabled: false,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_enhance_cards_enabled: false,
  };
  const fieldToggles = { withArticleRichContentState: false };

  const params = new URLSearchParams({
    variables: JSON.stringify(variables),
    features: JSON.stringify(features),
    fieldToggles: JSON.stringify(fieldToggles),
  });

  const resp = await fetch(`${GRAPHQL_ENDPOINT}?${params}`, {
    headers: {
      Authorization: BEARER,
      "x-guest-token": guestToken,
    },
  });
  
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Twitter API error ${resp.status}: ${text.slice(0, 300)}`);
  }
  return resp.json();
}

// Syndication fallback (uses Googlebot UA trick from yt-dlp)
function generateSyndicationToken(tweetId: string): string {
  const num = (Number(tweetId) / 1e15) * Math.PI;
  return num.toString(36).replace(/(0+|\.)/g, "");
}

async function getTweetViaSyndication(tweetId: string): Promise<any> {
  const token = generateSyndicationToken(tweetId);
  const resp = await fetch(
    `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=${token}`,
    { headers: { "User-Agent": "Googlebot" } }
  );
  if (!resp.ok) throw new Error(`Syndication API error: ${resp.status}`);
  return resp.json();
}

interface VideoVariant {
  bitrate?: number;
  content_type: string;
  url: string;
}

function extractVideoFromGraphQL(data: any): string {
  const result = data?.data?.tweetResult?.result;
  const tweet = result?.tweet || result;
  const legacy = tweet?.legacy;
  const media = legacy?.extended_entities?.media || legacy?.entities?.media;
  if (!media?.length) throw new Error("No media found in tweet");

  const video = media.find((m: any) => m.type === "video" || m.type === "animated_gif");
  if (!video) throw new Error("No video found in this tweet (might be images only)");

  const variants: VideoVariant[] = video.video_info?.variants || [];
  const mp4s = variants
    .filter((v) => v.content_type === "video/mp4")
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
  if (!mp4s.length) throw new Error("No downloadable video format found");
  return mp4s[0].url;
}

function extractVideoFromSyndication(data: any): string {
  const video = data?.video;
  if (!video?.variants?.length) {
    // Check mediaDetails
    const media = data?.mediaDetails;
    if (media) {
      const vid = media.find((m: any) => m.type === "video" || m.type === "animated_gif");
      if (vid?.video_info?.variants) {
        const mp4s = vid.video_info.variants
          .filter((v: any) => v.content_type === "video/mp4")
          .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
        if (mp4s.length) return mp4s[0].url;
      }
    }
    throw new Error("No video found in this tweet");
  }
  const mp4s = video.variants
    .filter((v: any) => v.type === "video/mp4")
    .sort((a: any, b: any) => (b.bitrate || 0) - (a.bitrate || 0));
  if (!mp4s.length) throw new Error("No downloadable video format");
  return mp4s[0].src || mp4s[0].url;
}

export async function downloadVideo(url: string, outputDir: string): Promise<DownloadResult> {
  const { tweetId } = validateUrl(url);
  let videoUrl: string;

  // Try GraphQL first, fall back to syndication
  try {
    const guestToken = await getGuestToken();
    const data = await getTweetData(tweetId, guestToken);
    videoUrl = extractVideoFromGraphQL(data);
  } catch (gqlErr: any) {
    console.log(`GraphQL failed (${gqlErr.message}), trying syndication...`);
    try {
      const synData = await getTweetViaSyndication(tweetId);
      videoUrl = extractVideoFromSyndication(synData);
    } catch (synErr: any) {
      throw new Error(`Could not extract video. GraphQL: ${gqlErr.message}. Syndication: ${synErr.message}`);
    }
  }

  // Download the video
  const resp = await fetch(videoUrl);
  if (!resp.ok) throw new Error(`Failed to download video: ${resp.status}`);

  const buffer = await resp.arrayBuffer();
  const filename = `${tweetId}.mp4`;
  const filepath = path.join(outputDir, filename);

  await writeFile(filepath, Buffer.from(buffer));
  const info = await stat(filepath);

  return { id: tweetId, filename, filepath, size: info.size };
}
