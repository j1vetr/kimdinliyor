import { SpotifyApi } from "@spotify/web-api-ts-sdk";

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=spotify',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const refreshToken = connectionSettings?.settings?.oauth?.credentials?.refresh_token;
  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;
  const clientId = connectionSettings?.settings?.oauth?.credentials?.client_id;
  const expiresIn = connectionSettings.settings?.oauth?.credentials?.expires_in;

  if (!connectionSettings || (!accessToken || !clientId || !refreshToken)) {
    throw new Error('Spotify not connected');
  }

  return { accessToken, clientId, refreshToken, expiresIn };
}

export async function getSpotifyClient(): Promise<SpotifyApi | null> {
  try {
    const { accessToken, clientId, refreshToken, expiresIn } = await getAccessToken();

    const spotify = SpotifyApi.withAccessToken(clientId, {
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: expiresIn || 3600,
      refresh_token: refreshToken,
    });

    return spotify;
  } catch (error) {
    console.error("Failed to get Spotify client:", error);
    return null;
  }
}

export async function isSpotifyConnected(): Promise<boolean> {
  try {
    await getAccessToken();
    return true;
  } catch {
    return false;
  }
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artist: string;
  albumArt: string | null;
  previewUrl: string | null;
}

export async function getRecentlyPlayedTracks(limit: number = 50): Promise<SpotifyTrack[]> {
  const client = await getSpotifyClient();
  if (!client) return [];

  try {
    const response = await client.player.getRecentlyPlayedTracks(limit);
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

export async function getTopTracks(limit: number = 50): Promise<SpotifyTrack[]> {
  const client = await getSpotifyClient();
  if (!client) return [];

  try {
    const response = await client.currentUser.topItems("tracks", "medium_term", limit);
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

export async function getUserPlaylists() {
  const client = await getSpotifyClient();
  if (!client) return [];

  try {
    const response = await client.currentUser.playlists.playlists(50);
    return response.items;
  } catch (error) {
    console.error("Failed to get playlists:", error);
    return [];
  }
}

export async function getPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const client = await getSpotifyClient();
  if (!client) return [];

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
