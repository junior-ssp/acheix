const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "m.youtube.com", "music.youtube.com", "youtu.be", "youtube-nocookie.com"]);

export function extractYouTubeVideoId(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();

  if (YOUTUBE_ID_PATTERN.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com" || host === "youtube-nocookie.com") {
      const watchId = url.searchParams.get("v");
      if (watchId && YOUTUBE_ID_PATTERN.test(watchId)) return watchId;

      const [firstPath, secondPath, thirdPath] = url.pathname.split("/").filter(Boolean);
      if (["live", "shorts", "embed"].includes(firstPath ?? "") && secondPath && YOUTUBE_ID_PATTERN.test(secondPath)) {
        return secondPath;
      }
      if (firstPath === "watch" && secondPath && YOUTUBE_ID_PATTERN.test(secondPath)) return secondPath;
      if (firstPath === "v" && secondPath && YOUTUBE_ID_PATTERN.test(secondPath)) return secondPath;
      if ((firstPath === "channel" || firstPath === "c" || firstPath?.startsWith("@")) && thirdPath && YOUTUBE_ID_PATTERN.test(thirdPath)) return thirdPath;
    }

    if (host === "youtu.be") {
      const [videoId] = url.pathname.split("/").filter(Boolean);
      if (videoId && YOUTUBE_ID_PATTERN.test(videoId)) return videoId;
    }
  } catch {
    return null;
  }

  return null;
}

export function isYouTubeUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const url = new URL(value.trim());
    return YOUTUBE_HOSTS.has(url.hostname.replace(/^www\./, "").toLowerCase());
  } catch {
    return false;
  }
}

export function youtubeWatchHref(value: string | null | undefined) {
  const videoId = extractYouTubeVideoId(value);
  if (videoId) return `/assistir?video=${encodeURIComponent(videoId)}`;
  return isYouTubeUrl(value) ? `/assistir?youtubeUrl=${encodeURIComponent(String(value).trim())}` : null;
}

export function youtubeEmbedSource(value: string | null | undefined) {
  const videoId = extractYouTubeVideoId(value);
  if (videoId) {
    return {
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1`,
      youtubeUrl: `https://www.youtube.com/watch?v=${videoId}`,
      playable: true
    };
  }

  if (!isYouTubeUrl(value)) return null;

  try {
    const url = new URL(String(value).trim());
    const pathParts = url.pathname.split("/").filter(Boolean);
    const channelIndex = pathParts.findIndex((part) => part === "channel");
    const channelId = channelIndex >= 0 ? pathParts[channelIndex + 1] : null;

    if (channelId && /^UC[A-Za-z0-9_-]{10,80}$/.test(channelId)) {
      return {
        embedUrl: `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId)}&rel=0&modestbranding=1&playsinline=1`,
        youtubeUrl: url.toString(),
        playable: true
      };
    }

    return { embedUrl: "", youtubeUrl: url.toString(), playable: false };
  } catch {
    return null;
  }
}
