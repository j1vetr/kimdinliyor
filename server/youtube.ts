const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || "";
const GOOGLE_REDIRECT_URI = process.env.NODE_ENV === "production" 
  ? "https://kimdinliyor.com/api/auth/google/callback"
  : "https://kimdinliyor.com/api/auth/google/callback";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.readonly",
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
  duration: string; // ISO 8601 duration (e.g., PT4M13S)
}

export interface ChannelStatistics {
  subscriberCount: string;
  viewCount: string;
  videoCount: string; // Kanal video sayısı
}

export async function getVideoStatistics(accessToken: string, videoIds: string[]): Promise<Map<string, VideoStatistics>> {
  const result = new Map<string, VideoStatistics>();
  if (videoIds.length === 0) return result;

  try {
    const idsParam = videoIds.slice(0, 50).join(",");
    // Request both statistics and contentDetails for duration
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=statistics,contentDetails&id=${idsParam}`,
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
        duration: item.contentDetails?.duration || "PT0S",
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
        videoCount: item.statistics?.videoCount || "0",
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
    duration: stats.get(video.id)?.duration || "PT0S",
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
    videoCount: stats.get(channel.id)?.videoCount || "0",
  }));
}

// Get the oldest liked video (first video the user ever liked)
// YouTube API returns videos in reverse chronological order of when they were liked
// So we need to paginate to the end to find the first/oldest like
export async function getOldestLikedVideo(accessToken: string): Promise<YouTubeVideo | null> {
  try {
    let pageToken: string | undefined = undefined;
    let lastVideos: YouTubeVideo[] = [];
    let iterations = 0;
    const maxIterations = 10; // Safety limit to avoid infinite loops
    
    // Paginate through all liked videos to find the oldest (last page, last item)
    while (iterations < maxIterations) {
      const url: string = pageToken 
        ? `https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=50&pageToken=${pageToken}`
        : `https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=50`;
      
      const response: Response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to get liked videos for oldest:", await response.text());
        break;
      }

      const data: any = await response.json();
      const videos = (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
        description: item.snippet.description?.slice(0, 200) || "",
        publishedAt: item.snippet.publishedAt || null,
      }));

      if (videos.length > 0) {
        lastVideos = videos;
      }

      // If there's no next page, we've reached the end
      if (!data.nextPageToken) {
        break;
      }
      
      pageToken = data.nextPageToken;
      iterations++;
    }

    // Return the last video from the last page (oldest liked)
    if (lastVideos.length > 0) {
      return lastVideos[lastVideos.length - 1];
    }

    return null;
  } catch (error) {
    console.error("Failed to get oldest liked video:", error);
    return null;
  }
}

// Get a few oldest liked videos (for variety in the game)
export async function getOldestLikedVideos(accessToken: string, count: number = 5): Promise<YouTubeVideo[]> {
  try {
    let pageToken: string | undefined = undefined;
    let lastPageVideos: YouTubeVideo[] = [];
    let secondLastPageVideos: YouTubeVideo[] = [];
    let iterations = 0;
    const maxIterations = 20; // Allow more iterations for larger like histories
    
    while (iterations < maxIterations) {
      const url: string = pageToken 
        ? `https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=50&pageToken=${pageToken}`
        : `https://www.googleapis.com/youtube/v3/videos?part=snippet&myRating=like&maxResults=50`;
      
      const response: Response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        console.error("Failed to get liked videos:", await response.text());
        break;
      }

      const data: any = await response.json();
      const videos = (data.items || []).map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
        description: item.snippet.description?.slice(0, 200) || "",
        publishedAt: item.snippet.publishedAt || null,
      }));

      if (videos.length > 0) {
        secondLastPageVideos = lastPageVideos;
        lastPageVideos = videos;
      }

      if (!data.nextPageToken) {
        break;
      }
      
      pageToken = data.nextPageToken;
      iterations++;
    }

    // Combine last two pages and take the oldest ones
    const allOldest = [...secondLastPageVideos, ...lastPageVideos];
    // Return the last 'count' videos (oldest liked)
    return allOldest.slice(-count);
  } catch (error) {
    console.error("Failed to get oldest liked videos:", error);
    return [];
  }
}

// ============= PUBLIC CONTENT (No user token needed) =============
// Uses global cache with 30-minute TTL to avoid excessive API calls

import { storage } from "./storage";
import type { InsertGlobalTrending, GlobalTrending } from "@shared/schema";

const CACHE_TTL_MINUTES = 30; // Refresh cache every 30 minutes

export interface TrendingVideo {
  id: string;
  title: string;
  channelTitle: string;
  thumbnailUrl: string | null;
  description: string;
  publishedAt: string | null;
  viewCount: string;
  duration: number; // in seconds
}

export interface PopularChannel {
  id: string;
  title: string;
  thumbnailUrl: string | null;
  description: string;
  subscriberCount: string;
  videoCount: string;
}

// Minimum view count for videos to be considered "popular" (1 million)
const MIN_VIDEO_VIEW_COUNT = 1000000;

// Get trending videos from YouTube Turkey (public API, no OAuth needed)
// Only returns videos with 1M+ views
export async function getTrendingVideos(count: number = 50): Promise<TrendingVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY not configured");
    return [];
  }
  
  try {
    // Get more videos to filter down to those with high view counts
    const trendingUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=TR&maxResults=50&key=${YOUTUBE_API_KEY}`;
    
    const response = await fetch(trendingUrl);
    
    if (!response.ok) {
      console.error("Failed to get trending videos:", await response.text());
      return [];
    }
    
    const data = await response.json();
    
    // Filter to only include videos with 1M+ views
    const popularVideos = (data.items || [])
      .filter((item: any) => {
        const viewCount = parseInt(item.statistics?.viewCount || "0");
        return viewCount >= MIN_VIDEO_VIEW_COUNT;
      })
      .map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
        description: item.snippet.description?.slice(0, 200) || "",
        publishedAt: item.snippet.publishedAt || null,
        viewCount: item.statistics?.viewCount || "0",
        duration: parseDuration(item.contentDetails?.duration || "PT0S"),
      }));
    
    console.log(`[getTrendingVideos] Found ${popularVideos.length} videos with 1M+ views`);
    
    // If we don't have enough, also fetch from Music category (usually has popular videos)
    if (popularVideos.length < count) {
      const musicUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=TR&videoCategoryId=10&maxResults=50&key=${YOUTUBE_API_KEY}`;
      
      const musicResponse = await fetch(musicUrl);
      
      if (musicResponse.ok) {
        const musicData = await musicResponse.json();
        
        for (const item of musicData.items || []) {
          const viewCount = parseInt(item.statistics?.viewCount || "0");
          if (viewCount >= MIN_VIDEO_VIEW_COUNT && !popularVideos.some((v: TrendingVideo) => v.id === item.id)) {
            popularVideos.push({
              id: item.id,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
              description: item.snippet.description?.slice(0, 200) || "",
              publishedAt: item.snippet.publishedAt || null,
              viewCount: item.statistics?.viewCount || "0",
              duration: parseDuration(item.contentDetails?.duration || "PT0S"),
            });
          }
        }
      }
    }
    
    return popularVideos.slice(0, count);
  } catch (error) {
    console.error("Failed to get trending videos:", error);
    return [];
  }
}

// Parse ISO 8601 duration to seconds
function parseDuration(isoDuration: string): number {
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  
  const hours = parseInt(match[1] || "0");
  const minutes = parseInt(match[2] || "0");
  const seconds = parseInt(match[3] || "0");
  
  return hours * 3600 + minutes * 60 + seconds;
}

// Popular Turkish YouTuber channel IDs (well-known creators with 500K+ subs)
const POPULAR_TURKISH_CHANNEL_IDS = [
  "UCq-Fj5jknLsUf-MWSy4_brA", // Enes Batur
  "UCiYlmvk0KjLrx5P-e09k22g", // Burak Oyunda
  "UCVPYbobPRzz0BWh-SfZdr6g", // Orkun Işıtmak
  "UCZ6iACaC7N-_r1lXbC0bU-Q", // Videoyun
  "UC8GAUZkLBBJmSCURJxHqhFw", // Halil İbrahim Göker
  "UCFWjEwhX6cSAKBQ28pufG3w", // Ruhi Çenet
  "UCxHoBXkY88Tb8z1Sjk8J-Tg", // Reynmen
  "UC7Qy6nK9RFcDKoFHhKPNWZw", // Berk Coşkun
  "UCfap1JJZ4J8WCJ2h6lFFGhQ", // Danla Bilic
  "UCJLbhfXA_7TldIFtq7cXamA", // Şehinşah
  "UCPGvCfFddSgaMBJV6wQ6TKw", // Mesut Can Tomay
  "UC_5qA4VElL1aL5H6c4i7LLQ", // WTCN
  "UCxNlpqJK9JN8JRaKYDy3H7w", // Tuna Tavus
  "UCfR8HhkbpDAwvYxrecNg4Mg", // Barış Özcan
  "UCwCMqECRNcnCc6q9ekpJrDA", // MEMO
  "UC0lT9K8Wfuc1KPqm6YjRf1A", // Duygu Özaslan
  "UCVj6Gw-cL6GfnHTaUVNg--Q", // Sadakatsiz (dizi)
  "UCNm0GhRUxBHqMpq4b27CmFg", // Ferit Karakaya
  "UCK7B2nPQ2hc_VrWkrI8Lz9A", // Kafalar
  "UCrAF_F3_X_FddJxF_D0cLtw", // Mert Sarıc
];

// Get popular channels from Turkey (using predefined list + search)
export async function getPopularChannels(count: number = 25): Promise<PopularChannel[]> {
  if (!YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY not configured");
    return [];
  }
  
  try {
    const allChannels: PopularChannel[] = [];
    
    // Step 1: Get channel details for predefined popular Turkish YouTubers
    const predefinedIds = POPULAR_TURKISH_CHANNEL_IDS.slice(0, 20).join(",");
    const predefinedUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${predefinedIds}&key=${YOUTUBE_API_KEY}`;
    
    const predefinedResponse = await fetch(predefinedUrl);
    
    if (predefinedResponse.ok) {
      const predefinedData = await predefinedResponse.json();
      for (const item of predefinedData.items || []) {
        const subCount = parseInt(item.statistics?.subscriberCount || "0");
        // Only include channels with 500K+ subscribers
        if (subCount >= 500000) {
          allChannels.push({
            id: item.id,
            title: item.snippet.title,
            thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
            description: item.snippet.description?.slice(0, 200) || "",
            subscriberCount: item.statistics?.subscriberCount || "0",
            videoCount: item.statistics?.videoCount || "0",
          });
        }
      }
    }
    
    // Step 2: If we need more, search for additional popular Turkish channels
    if (allChannels.length < count) {
      const searchTerms = ["türk youtuber", "türkiye youtube", "türk oyun", "türk müzik"];
      const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
      
      const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(randomTerm)}&regionCode=TR&maxResults=25&order=viewCount&key=${YOUTUBE_API_KEY}`;
      
      const searchResponse = await fetch(searchUrl);
      
      if (searchResponse.ok) {
        const searchData = await searchResponse.json();
        const channelIds = (searchData.items || [])
          .map((item: any) => item.snippet.channelId)
          .filter((id: string) => !allChannels.some(c => c.id === id))
          .join(",");
        
        if (channelIds) {
          const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&id=${channelIds}&key=${YOUTUBE_API_KEY}`;
          const channelsResponse = await fetch(channelsUrl);
          
          if (channelsResponse.ok) {
            const channelsData = await channelsResponse.json();
            for (const item of channelsData.items || []) {
              const subCount = parseInt(item.statistics?.subscriberCount || "0");
              // Only include channels with 500K+ subscribers
              if (subCount >= 500000) {
                allChannels.push({
                  id: item.id,
                  title: item.snippet.title,
                  thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
                  description: item.snippet.description?.slice(0, 200) || "",
                  subscriberCount: item.statistics?.subscriberCount || "0",
                  videoCount: item.statistics?.videoCount || "0",
                });
              }
            }
          }
        }
      }
    }
    
    console.log(`[getPopularChannels] Found ${allChannels.length} channels with 500K+ subscribers`);
    
    // Shuffle and return
    return allChannels.sort(() => Math.random() - 0.5).slice(0, count);
  } catch (error) {
    console.error("Failed to get popular channels:", error);
    return [];
  }
}

// Get random videos for comparison (different from trending, more variety)
// Only returns videos with 1M+ views
export async function getRandomVideosForComparison(count: number = 30): Promise<TrendingVideo[]> {
  if (!YOUTUBE_API_KEY) {
    console.error("YOUTUBE_API_KEY not configured");
    return [];
  }
  
  try {
    const allVideos: TrendingVideo[] = [];
    
    // Get videos from different categories
    const categoryIds = ["10", "20", "24"]; // Music, Gaming, Entertainment - most likely to have popular content
    
    for (const categoryId of categoryIds) {
      const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=TR&videoCategoryId=${categoryId}&maxResults=50&key=${YOUTUBE_API_KEY}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        
        for (const item of data.items || []) {
          const viewCount = parseInt(item.statistics?.viewCount || "0");
          // Only include videos with 1M+ views
          if (viewCount >= MIN_VIDEO_VIEW_COUNT && !allVideos.some(v => v.id === item.id)) {
            allVideos.push({
              id: item.id,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              thumbnailUrl: item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || null,
              description: item.snippet.description?.slice(0, 200) || "",
              publishedAt: item.snippet.publishedAt || null,
              viewCount: item.statistics?.viewCount || "0",
              duration: parseDuration(item.contentDetails?.duration || "PT0S"),
            });
          }
        }
      }
      
      // If we have enough videos, stop fetching
      if (allVideos.length >= count) break;
    }
    
    console.log(`[getRandomVideosForComparison] Found ${allVideos.length} videos with 1M+ views`);
    
    // Shuffle and return
    return allVideos.sort(() => Math.random() - 0.5).slice(0, count);
  } catch (error) {
    console.error("Failed to get random videos:", error);
    return [];
  }
}

// ============= CACHED CONTENT FUNCTIONS =============
// These functions use the global cache with TTL to minimize API usage

// Simple lock to prevent concurrent cache refreshes
const refreshLocks = {
  video: false,
  channel: false,
};

/**
 * Get cached trending videos. If cache is stale or empty, refresh from YouTube API.
 * Returns content from global cache, ensuring variety across games.
 * Uses a lock to prevent concurrent refresh operations.
 */
export async function getCachedTrendingVideos(count: number = 10, excludeIds: string[] = []): Promise<GlobalTrending[]> {
  const cacheAge = await storage.getTrendingCacheAge("video");
  
  // If cache is empty or older than TTL, refresh it (with lock)
  if ((cacheAge === null || cacheAge > CACHE_TTL_MINUTES) && !refreshLocks.video) {
    refreshLocks.video = true;
    console.log(`Refreshing video cache (age: ${cacheAge} minutes, TTL: ${CACHE_TTL_MINUTES} minutes)`);
    
    try {
      const trendingVideos = await getTrendingVideos(50);
      
      if (trendingVideos.length > 0) {
        const cacheItems: InsertGlobalTrending[] = trendingVideos.map(video => ({
          contentId: video.id,
          contentType: "video",
          title: video.title,
          subtitle: video.channelTitle,
          thumbnailUrl: video.thumbnailUrl,
          viewCount: video.viewCount,
          duration: video.duration,
          publishedAt: video.publishedAt,
        }));
        
        await storage.refreshGlobalTrending("video", cacheItems);
        console.log(`Cached ${cacheItems.length} trending videos`);
      }
    } finally {
      refreshLocks.video = false;
    }
  }
  
  // Get random content from cache, excluding already used IDs
  return storage.getRandomTrendingContent("video", count, excludeIds);
}

/**
 * Get cached popular channels. If cache is stale or empty, refresh from YouTube API.
 * Uses a lock to prevent concurrent refresh operations.
 */
export async function getCachedPopularChannels(count: number = 10, excludeIds: string[] = []): Promise<GlobalTrending[]> {
  const cacheAge = await storage.getTrendingCacheAge("channel");
  
  // If cache is empty or older than TTL, refresh it (with lock)
  if ((cacheAge === null || cacheAge > CACHE_TTL_MINUTES) && !refreshLocks.channel) {
    refreshLocks.channel = true;
    console.log(`Refreshing channel cache (age: ${cacheAge} minutes, TTL: ${CACHE_TTL_MINUTES} minutes)`);
    
    try {
      const popularChannels = await getPopularChannels(25);
      
      if (popularChannels.length > 0) {
        const cacheItems: InsertGlobalTrending[] = popularChannels.map(channel => ({
          contentId: channel.id,
          contentType: "channel",
          title: channel.title,
          subtitle: channel.description,
          thumbnailUrl: channel.thumbnailUrl,
          subscriberCount: channel.subscriberCount,
          videoCount: channel.videoCount,
        }));
        
        await storage.refreshGlobalTrending("channel", cacheItems);
        console.log(`Cached ${cacheItems.length} popular channels`);
      }
    } finally {
      refreshLocks.channel = false;
    }
  }
  
  // Get random content from cache, excluding already used IDs
  return storage.getRandomTrendingContent("channel", count, excludeIds);
}

/**
 * Get content for a specific game mode from cache.
 * Tracks used content IDs to ensure variety in subsequent games/rounds.
 */
export async function getContentForGameMode(
  mode: string,
  count: number,
  usedContentIds: string[] = []
): Promise<GlobalTrending[]> {
  switch (mode) {
    case "which_older":
    case "most_viewed":
    case "which_longer":
      return getCachedTrendingVideos(count, usedContentIds);
    
    case "which_more_subs":
    case "which_more_videos":
      return getCachedPopularChannels(count, usedContentIds);
    
    default:
      return [];
  }
}
