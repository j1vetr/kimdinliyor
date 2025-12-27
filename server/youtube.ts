const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const GOOGLE_REDIRECT_URI = process.env.NODE_ENV === "production" 
  ? "https://kimdinliyor.com/api/auth/google/callback"
  : "https://kimdinliyor.com/api/auth/google/callback";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.force-ssl",
  "https://www.googleapis.com/auth/userinfo.profile",
].join(" ");

export function getGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: YOUTUBE_SCOPES,
    state: state,
    access_type: "offline",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: "authorization_code",
        redirect_uri: GOOGLE_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      console.error("Google token exchange failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Google token exchange error:", error);
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });

    if (!response.ok) {
      console.error("Google token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Google token refresh error:", error);
    return null;
  }
}

export interface GoogleUserProfile {
  displayName: string;
  avatarUrl: string | null;
}

export async function getUserProfile(accessToken: string): Promise<GoogleUserProfile | null> {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      console.error("Failed to get Google user profile:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      displayName: data.name || "YouTube User",
      avatarUrl: data.picture || null,
    };
  } catch (error) {
    console.error("Failed to get Google user profile:", error);
    return null;
  }
}

export interface YouTubeVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  description: string;
  publishedAt: string | null; // ISO date string
}

export interface YouTubeChannel {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  subscriberCount: string;
}

export async function getLikedVideos(accessToken: string, maxResults: number = 50): Promise<YouTubeVideo[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to get liked videos:", await response.text());
      return [];
    }

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
      description: item.snippet.description?.slice(0, 200) || "",
      publishedAt: item.snippet.publishedAt || null,
    }));
  } catch (error) {
    console.error("Failed to get liked videos:", error);
    return [];
  }
}

export async function getSubscriptions(accessToken: string, maxResults: number = 50): Promise<YouTubeChannel[]> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/subscriptions?part=snippet&mine=true&maxResults=${maxResults}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to get subscriptions:", await response.text());
      return [];
    }

    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      id: item.snippet.resourceId.channelId,
      title: item.snippet.title,
      thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
      subscriberCount: "",
    }));
  } catch (error) {
    console.error("Failed to get subscriptions:", error);
    return [];
  }
}

export interface VideoStatistics {
  viewCount: string;
  likeCount: string;
}

export interface ChannelStatistics {
  subscriberCount: string;
  viewCount: string;
}

export async function getVideoStatistics(accessToken: string, videoIds: string[]): Promise<Map<string, VideoStatistics>> {
  const result = new Map<string, VideoStatistics>();
  if (videoIds.length === 0) return result;

  try {
    const idsParam = videoIds.slice(0, 50).join(",");
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${idsParam}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to get video statistics:", await response.text());
      return result;
    }

    const data = await response.json();
    for (const item of data.items || []) {
      result.set(item.id, {
        viewCount: item.statistics?.viewCount || "0",
        likeCount: item.statistics?.likeCount || "0",
      });
    }
    return result;
  } catch (error) {
    console.error("Failed to get video statistics:", error);
    return result;
  }
}

export async function getChannelStatistics(accessToken: string, channelIds: string[]): Promise<Map<string, ChannelStatistics>> {
  const result = new Map<string, ChannelStatistics>();
  if (channelIds.length === 0) return result;

  try {
    const idsParam = channelIds.slice(0, 50).join(",");
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${idsParam}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Failed to get channel statistics:", await response.text());
      return result;
    }

    const data = await response.json();
    for (const item of data.items || []) {
      result.set(item.id, {
        subscriberCount: item.statistics?.subscriberCount || "0",
        viewCount: item.statistics?.viewCount || "0",
      });
    }
    return result;
  } catch (error) {
    console.error("Failed to get channel statistics:", error);
    return result;
  }
}

export async function getLikedVideosWithStats(accessToken: string, maxResults: number = 50): Promise<(YouTubeVideo & VideoStatistics)[]> {
  const videos = await getLikedVideos(accessToken, maxResults);
  if (videos.length === 0) return [];

  const stats = await getVideoStatistics(accessToken, videos.map(v => v.id));
  
  return videos.map(video => ({
    ...video,
    viewCount: stats.get(video.id)?.viewCount || "0",
    likeCount: stats.get(video.id)?.likeCount || "0",
  }));
}

export async function getSubscriptionsWithStats(accessToken: string, maxResults: number = 50): Promise<(YouTubeChannel & ChannelStatistics)[]> {
  const channels = await getSubscriptions(accessToken, maxResults);
  if (channels.length === 0) return [];

  const stats = await getChannelStatistics(accessToken, channels.map(c => c.id));
  
  return channels.map(channel => ({
    ...channel,
    subscriberCount: stats.get(channel.id)?.subscriberCount || "0",
    viewCount: stats.get(channel.id)?.viewCount || "0",
  }));
}
