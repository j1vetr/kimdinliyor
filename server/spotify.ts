import { SpotifyApi } from "@spotify/web-api-ts-sdk";

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "";
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || "";

const SPOTIFY_SCOPES = [
  "user-read-recently-played",
  "user-top-read",
  "playlist-read-private",
  "playlist-read-collaborative",
].join(" ");

export function getSpotifyAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: "code",
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: SPOTIFY_SCOPES,
    state: state,
  });
  return `https://accounts.spotify.com/authorize?${params.toString()}`;
}

export async function exchangeCodeForTokens(code: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
} | null> {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: SPOTIFY_REDIRECT_URI,
      }),
    });

    if (!response.ok) {
      console.error("Token exchange failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Token exchange error:", error);
    return null;
  }
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
} | null> {
  try {
    const response = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error("Token refresh failed:", await response.text());
      return null;
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
    };
  } catch (error) {
    console.error("Token refresh error:", error);
    return null;
  }
}

export function createSpotifyClient(accessToken: string): SpotifyApi {
  return SpotifyApi.withAccessToken(SPOTIFY_CLIENT_ID, {
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 3600,
    refresh_token: "",
  });
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
  previewUrl: string | null;
}

export async function getRecentlyPlayedTracks(accessToken: string, limit: number = 50): Promise<SpotifyTrack[]> {
  const client = createSpotifyClient(accessToken);

  try {
    const response = await client.player.getRecentlyPlayedTracks(limit as 50);
    return response.items.map((item) => ({
      id: item.track.id,
      name: item.track.name,
      artist: item.track.artists.map((a) => a.name).join(", "),
      albumArt: item.track.album.images[0]?.url || null,
      previewUrl: item.track.preview_url,
    }));
  } catch (error) {
    console.error("Failed to get recently played tracks:", error);
    return [];
  }
}

export async function getTopTracks(accessToken: string, limit: number = 50): Promise<SpotifyTrack[]> {
  const client = createSpotifyClient(accessToken);

  try {
    const response = await client.currentUser.topItems("tracks", "medium_term", limit as 50);
    return response.items.map((track) => ({
      id: track.id,
      name: track.name,
      artist: track.artists.map((a) => a.name).join(", "),
      albumArt: track.album.images[0]?.url || null,
      previewUrl: track.preview_url,
    }));
  } catch (error) {
    console.error("Failed to get top tracks:", error);
    return [];
  }
}

export async function getUserPlaylists(accessToken: string) {
  const client = createSpotifyClient(accessToken);

  try {
    const response = await client.currentUser.playlists.playlists(50);
    return response.items;
  } catch (error) {
    console.error("Failed to get playlists:", error);
    return [];
  }
}

export async function getPlaylistTracks(accessToken: string, playlistId: string): Promise<SpotifyTrack[]> {
  const client = createSpotifyClient(accessToken);

  try {
    const response = await client.playlists.getPlaylistItems(playlistId, undefined, undefined, 50);
    return response.items
      .filter((item) => item.track && "id" in item.track)
      .map((item) => {
        const track = item.track as any;
        return {
          id: track.id,
          name: track.name,
          artist: track.artists?.map((a: any) => a.name).join(", ") || "Unknown Artist",
          albumArt: track.album?.images?.[0]?.url || null,
          previewUrl: track.preview_url || null,
        };
      });
  } catch (error) {
    console.error("Failed to get playlist tracks:", error);
    return [];
  }
}
