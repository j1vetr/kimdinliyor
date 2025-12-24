import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, generateUniqueRoomCode, generateUniqueName, hashPassword, verifyPassword } from "./storage";
import { getSpotifyAuthUrl, exchangeCodeForTokens, refreshAccessToken, getRecentlyPlayedTracks, getTopTracks, getAvailableDevices, playTrackOnDevice, pausePlayback, getUserProfile } from "./spotify";
import type { Room, RoomPlayer, Track } from "@shared/schema";

// WebSocket connections by room code
const roomConnections = new Map<string, Set<WebSocket>>();

// Game state management
interface GameState {
  status: "waiting" | "question" | "results" | "finished";
  currentRound: number;
  timeLeft: number;
  trackId: string | null;
  roundStartTime: number | null;
  answeredUsers: Set<string>;
  usedTrackIds: Set<string>;
  tracksByOwner: Map<string, string[]>;
  lastOwnerIndex: number;
  isLightningRound: boolean;
  playerStreaks: Map<string, number>;
}

const gameStates = new Map<string, GameState>();

// User selected devices
const userDevices = new Map<string, string>();

// Helper: Check if round is lightning round (every 5th round: 5, 10)
function isLightningRound(roundNumber: number): boolean {
  return roundNumber % 5 === 0 && roundNumber > 0;
}

// Helper: Get round time limit
function getRoundTimeLimit(roundNumber: number): number {
  return isLightningRound(roundNumber) ? 10 : 20;
}

function broadcastToRoom(roomCode: string, message: any) {
  const connections = roomConnections.get(roomCode);
  if (connections) {
    const data = JSON.stringify(message);
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });
  }
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  wss.on("connection", (ws, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const roomCode = url.searchParams.get("room");

    if (roomCode) {
      if (!roomConnections.has(roomCode)) {
        roomConnections.set(roomCode, new Set());
      }
      roomConnections.get(roomCode)!.add(ws);

      ws.on("close", () => {
        roomConnections.get(roomCode)?.delete(ws);
      });
    }
  });

  // Spotify OAuth - Check user connection status
  app.get("/api/spotify/status", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== "string") {
        return res.json({ connected: false });
      }
      const token = await storage.getSpotifyToken(userId);
      res.json({ connected: !!token });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Spotify OAuth - Get auth URL for a user
  app.get("/api/spotify/auth-url", async (req, res) => {
    try {
      const { userId, roomCode } = req.query;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId gerekli" });
      }
      const state = `${userId}:${roomCode || ""}`;
      const authUrl = getSpotifyAuthUrl(state);
      res.json({ authUrl });
    } catch (error) {
      res.status(500).json({ error: "Spotify auth error" });
    }
  });

  // Spotify OAuth - Callback
  app.get("/api/spotify/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        return res.redirect("/?spotify_error=access_denied");
      }

      if (!code || typeof code !== "string" || !state || typeof state !== "string") {
        return res.redirect("/?spotify_error=invalid_request");
      }

      const [userId, roomCode] = state.split(":");
      
      const tokens = await exchangeCodeForTokens(code);
      if (!tokens) {
        return res.redirect("/?spotify_error=token_exchange_failed");
      }

      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      await storage.saveSpotifyToken(userId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
      });

      // Fetch and save user profile (avatar)
      const profile = await getUserProfile(tokens.accessToken);
      await storage.updateUser(userId, { 
        spotifyConnected: true,
        avatarUrl: profile?.avatarUrl || null
      });

      if (roomCode) {
        return res.redirect(`/oyun/${roomCode}/lobi?spotify_connected=true`);
      }
      return res.redirect("/?spotify_connected=true");
    } catch (error) {
      console.error("Spotify callback error:", error);
      res.redirect("/?spotify_error=callback_failed");
    }
  });

  // Get user's available Spotify devices
  app.get("/api/spotify/devices", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId gerekli" });
      }

      let token = await storage.getSpotifyToken(userId);
      if (!token) {
        return res.status(401).json({ error: "Spotify bağlantısı gerekli" });
      }

      // Refresh token if expired
      if (token.expiresAt < new Date()) {
        const refreshed = await refreshAccessToken(token.refreshToken);
        if (refreshed) {
          const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
          await storage.saveSpotifyToken(userId, {
            accessToken: refreshed.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: newExpiresAt,
          });
          token = { ...token, accessToken: refreshed.accessToken, expiresAt: newExpiresAt };
        }
      }

      const devices = await getAvailableDevices(token.accessToken);
      const selectedDeviceId = userDevices.get(userId);
      
      res.json({ 
        devices,
        selectedDeviceId: selectedDeviceId || null
      });
    } catch (error) {
      console.error("Get devices error:", error);
      res.status(500).json({ error: "Cihazlar alınamadı" });
    }
  });

  // Select a device for playback
  app.post("/api/spotify/select-device", async (req, res) => {
    try {
      const { userId, deviceId } = req.body;
      if (!userId || !deviceId) {
        return res.status(400).json({ error: "userId ve deviceId gerekli" });
      }

      userDevices.set(userId, deviceId);
      res.json({ success: true });
    } catch (error) {
      console.error("Select device error:", error);
      res.status(500).json({ error: "Cihaz seçilemedi" });
    }
  });

  // Play track on user's device
  app.post("/api/spotify/play", async (req, res) => {
    try {
      const { userId, trackId } = req.body;
      if (!userId || !trackId) {
        return res.status(400).json({ error: "userId ve trackId gerekli" });
      }

      let token = await storage.getSpotifyToken(userId);
      if (!token) {
        return res.status(401).json({ error: "Spotify bağlantısı gerekli" });
      }

      // Refresh token if expired
      if (token.expiresAt < new Date()) {
        const refreshed = await refreshAccessToken(token.refreshToken);
        if (refreshed) {
          const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
          await storage.saveSpotifyToken(userId, {
            accessToken: refreshed.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: newExpiresAt,
          });
          token = { ...token, accessToken: refreshed.accessToken, expiresAt: newExpiresAt };
        }
      }

      let deviceId = userDevices.get(userId);
      
      // If no device selected, try to get an active device
      if (!deviceId) {
        const devices = await getAvailableDevices(token.accessToken);
        const activeDevice = devices.find(d => d.isActive);
        if (activeDevice) {
          deviceId = activeDevice.id;
          userDevices.set(userId, deviceId);
        } else if (devices.length > 0) {
          deviceId = devices[0].id;
          userDevices.set(userId, deviceId);
        }
      }
      
      if (!deviceId) {
        return res.status(400).json({ error: "Cihaz bulunamadı", fallbackToPreview: true });
      }

      const success = await playTrackOnDevice(token.accessToken, trackId, deviceId);
      if (!success) {
        return res.status(400).json({ error: "Şarkı çalınamadı", fallbackToPreview: true });
      }
      res.json({ success });
    } catch (error) {
      console.error("Play track error:", error);
      res.status(500).json({ error: "Şarkı çalınamadı", fallbackToPreview: true });
    }
  });

  // Pause playback
  app.post("/api/spotify/pause", async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ error: "userId gerekli" });
      }

      const deviceId = userDevices.get(userId);
      
      let token = await storage.getSpotifyToken(userId);
      if (!token) {
        return res.status(401).json({ error: "Spotify bağlantısı gerekli" });
      }

      // Refresh token if expired
      if (token.expiresAt < new Date()) {
        const refreshed = await refreshAccessToken(token.refreshToken);
        if (refreshed) {
          const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
          await storage.saveSpotifyToken(userId, {
            accessToken: refreshed.accessToken,
            refreshToken: token.refreshToken,
            expiresAt: newExpiresAt,
          });
          token = { ...token, accessToken: refreshed.accessToken, expiresAt: newExpiresAt };
        }
      }

      await pausePlayback(token.accessToken, deviceId);
      res.json({ success: true });
    } catch (error) {
      console.error("Pause error:", error);
      res.status(500).json({ error: "Durdurma başarısız" });
    }
  });

  // Room info (public)
  app.get("/api/rooms/:code/info", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomByCode(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      res.json({
        room: {
          id: room.id,
          name: room.name,
          maxPlayers: room.maxPlayers,
          isPublic: room.isPublic,
          status: room.status,
        },
        requiresPassword: !room.isPublic && !!room.passwordHash,
      });
    } catch (error) {
      res.status(500).json({ error: "Oda bilgisi alınamadı" });
    }
  });

  // Get room with players
  app.get("/api/rooms/:code", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomWithPlayers(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      res.json(room);
    } catch (error) {
      res.status(500).json({ error: "Oda bilgisi alınamadı" });
    }
  });

  // Create room
  app.post("/api/rooms", async (req, res) => {
    try {
      const { name, maxPlayers, totalRounds, roundDuration, isPublic, password } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Oda adı gerekli" });
      }

      const code = await generateUniqueRoomCode();
      const passwordHash = password ? await hashPassword(password) : null;

      const room = await storage.createRoom({
        code,
        name: name.trim(),
        maxPlayers: maxPlayers || 8,
        isPublic: isPublic !== false,
        passwordHash,
        hostUserId: null,
        totalRounds: totalRounds || 10,
        roundDuration: roundDuration || 20,
      });

      res.json({ id: room.id, code: room.code, name: room.name });
    } catch (error) {
      console.error("Create room error:", error);
      res.status(500).json({ error: "Oda oluşturulamadı" });
    }
  });

  // Join room
  app.post("/api/rooms/:code/join", async (req, res) => {
    try {
      const { code } = req.params;
      const { displayName, password } = req.body;

      if (!displayName || displayName.trim().length === 0) {
        return res.status(400).json({ error: "İsim gerekli" });
      }

      const room = await storage.getRoomByCode(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      // Allow joining when waiting or finished (after game ends)
      // Block joining during active game
      if (room.status === "playing") {
        return res.status(400).json({ error: "Oyun devam ediyor, şu anda katılamazsınız" });
      }

      // Check password for private rooms
      if (!room.isPublic && room.passwordHash) {
        if (!password) {
          return res.status(401).json({ error: "Şifre gerekli" });
        }
        const valid = await verifyPassword(password, room.passwordHash);
        if (!valid) {
          return res.status(401).json({ error: "Yanlış şifre" });
        }
      }

      // Check max players
      const players = await storage.getRoomPlayers(room.id);
      if (players.length >= (room.maxPlayers || 8)) {
        return res.status(400).json({ error: "Oda dolu" });
      }

      // Create unique user name
      const uniqueName = await generateUniqueName(displayName.trim());
      
      // Create user (Spotify not connected yet - will connect via OAuth)
      const user = await storage.createUser({
        displayName: displayName.trim(),
        uniqueName,
        spotifyConnected: false,
      });

      // Add player to room
      await storage.addPlayerToRoom({
        roomId: room.id,
        userId: user.id,
      });

      // Set host if first player
      if (players.length === 0) {
        await storage.updateRoom(room.id, { hostUserId: user.id });
      }

      // Broadcast update
      broadcastToRoom(code.toUpperCase(), { type: "player_joined", userId: user.id });

      res.json({ userId: user.id, roomId: room.id });
    } catch (error) {
      console.error("Join room error:", error);
      res.status(500).json({ error: "Odaya katılınamadı" });
    }
  });

  // Kick player from room (host only)
  app.post("/api/rooms/:code/kick", async (req, res) => {
    try {
      const { code } = req.params;
      const { requesterId, targetUserId } = req.body;

      if (!requesterId || !targetUserId) {
        return res.status(400).json({ error: "Gerekli bilgiler eksik" });
      }

      const room = await storage.getRoomByCode(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      // Verify the requester is actually in the room
      const players = await storage.getRoomPlayers(room.id);
      const requesterInRoom = players.some(p => p.userId === requesterId);
      if (!requesterInRoom) {
        return res.status(403).json({ error: "Bu odada değilsiniz" });
      }

      // Verify the requester is the host (server-side verification)
      if (room.hostUserId !== requesterId) {
        return res.status(403).json({ error: "Sadece host oyuncu atabilir" });
      }

      // Cannot kick yourself
      if (requesterId === targetUserId) {
        return res.status(400).json({ error: "Kendinizi atamazsınız" });
      }

      // Cannot kick during game
      if (room.status === "playing") {
        return res.status(400).json({ error: "Oyun sırasında oyuncu atılamaz" });
      }

      // Verify target is in the room
      const targetInRoom = players.some(p => p.userId === targetUserId);
      if (!targetInRoom) {
        return res.status(404).json({ error: "Oyuncu bulunamadı" });
      }

      // Remove player from room
      await storage.removePlayerFromRoom(room.id, targetUserId);

      // Broadcast update
      broadcastToRoom(code.toUpperCase(), { type: "player_kicked", userId: targetUserId });

      res.json({ success: true });
    } catch (error) {
      console.error("Kick player error:", error);
      res.status(500).json({ error: "Oyuncu atılamadı" });
    }
  });

  // Start game
  app.post("/api/rooms/:code/start", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomByCode(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      const players = await storage.getRoomPlayers(room.id);
      if (players.length < 2) {
        return res.status(400).json({ error: "En az 2 oyuncu gerekli" });
      }

      // Check if all players have Spotify connected
      const playersWithUsers = await storage.getRoomWithPlayers(code.toUpperCase());
      const disconnectedPlayers = playersWithUsers?.players.filter(p => !p.user.spotifyConnected) || [];
      if (disconnectedPlayers.length > 0) {
        const names = disconnectedPlayers.map(p => p.user.displayName).join(", ");
        return res.status(400).json({ 
          error: `Tüm oyuncuların Spotify bağlaması gerekli. Bağlanmayanlar: ${names}` 
        });
      }

      // Reset player scores for new game
      await storage.resetPlayerScores(room.id);
      
      // Fetch tracks from each player's Spotify account
      await storage.clearRoomTracks(room.id);
      
      const tracksByUser = new Map<string, { track: any; userId: string }[]>();
      
      for (const player of players) {
        try {
          let token = await storage.getSpotifyToken(player.userId);
          if (!token) continue;

          // Refresh token if expired
          if (token.expiresAt < new Date()) {
            const refreshed = await refreshAccessToken(token.refreshToken);
            if (refreshed) {
              const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
              await storage.saveSpotifyToken(player.userId, {
                accessToken: refreshed.accessToken,
                refreshToken: token.refreshToken,
                expiresAt: newExpiresAt,
              });
              token = { ...token, accessToken: refreshed.accessToken, expiresAt: newExpiresAt };
            }
          }

          const recentTracks = await getRecentlyPlayedTracks(token.accessToken, 20);
          const topTracks = await getTopTracks(token.accessToken, 15);
          
          const allTracks = [...recentTracks, ...topTracks];
          for (const track of allTracks) {
            if (!tracksByUser.has(track.id)) {
              tracksByUser.set(track.id, []);
            }
            const existing = tracksByUser.get(track.id)!;
            if (!existing.some(e => e.userId === player.userId)) {
              existing.push({ track, userId: player.userId });
            }
          }
        } catch (error) {
          console.error(`Failed to fetch tracks for user ${player.userId}:`, error);
        }
      }

      // Add tracks to cache with actual listeners
      if (tracksByUser.size > 0) {
        for (const [trackId, entries] of Array.from(tracksByUser.entries())) {
          const track = entries[0].track;
          const listeners = entries.map(e => e.userId);

          await storage.addTrack({
            roomId: room.id,
            trackId: track.id,
            trackName: track.name,
            artistName: track.artist,
            albumArtUrl: track.albumArt,
            previewUrl: track.previewUrl,
            sourceUserIds: listeners,
          });
        }
      } else {
        // Create demo tracks if no Spotify tracks available
        const demoTracks = [
          { name: "Bohemian Rhapsody", artist: "Queen" },
          { name: "Stairway to Heaven", artist: "Led Zeppelin" },
          { name: "Hotel California", artist: "Eagles" },
          { name: "Sweet Child O' Mine", artist: "Guns N' Roses" },
          { name: "Smells Like Teen Spirit", artist: "Nirvana" },
        ];

        for (const track of demoTracks) {
          const numListeners = Math.floor(Math.random() * players.length) + 1;
          const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
          const listeners = shuffledPlayers.slice(0, numListeners).map(p => p.userId);

          await storage.addTrack({
            roomId: room.id,
            trackId: `demo-${Math.random().toString(36).slice(2)}`,
            trackName: track.name,
            artistName: track.artist,
            albumArtUrl: null,
            previewUrl: null,
            sourceUserIds: listeners,
          });
        }
      }

      // Build tracks by owner for fair distribution
      const tracks = await storage.getTracksByRoom(room.id);
      const tracksByOwner = new Map<string, string[]>();
      
      for (const track of tracks) {
        const primaryOwner = track.sourceUserIds[0];
        if (primaryOwner) {
          if (!tracksByOwner.has(primaryOwner)) {
            tracksByOwner.set(primaryOwner, []);
          }
          tracksByOwner.get(primaryOwner)!.push(track.id);
        }
      }

      // Start the game
      await storage.updateRoom(room.id, { status: "playing", currentRound: 0 });

      // Initialize game state
      gameStates.set(code.toUpperCase(), {
        status: "waiting",
        currentRound: 0,
        timeLeft: 20,
        trackId: null,
        roundStartTime: null,
        answeredUsers: new Set(),
        usedTrackIds: new Set(),
        tracksByOwner,
        lastOwnerIndex: -1,
        isLightningRound: false,
        playerStreaks: new Map(),
      });

      // Start first round after a short delay
      setTimeout(() => startNextRound(code.toUpperCase()), 2000);

      broadcastToRoom(code.toUpperCase(), { type: "game_started" });
      res.json({ success: true });
    } catch (error) {
      console.error("Start game error:", error);
      res.status(500).json({ error: "Oyun başlatılamadı" });
    }
  });

  // Get game state
  app.get("/api/rooms/:code/game", async (req, res) => {
    try {
      const { code } = req.params;
      const { userId } = req.query;
      const room = await storage.getRoomWithPlayers(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      const gameState = gameStates.get(code.toUpperCase());
      const currentRound = await storage.getCurrentRound(room.id);
      let track: Track | null = null;
      let correctPlayerIds: string[] = [];

      if (currentRound?.trackId) {
        const tracks = await storage.getTracksByRoom(room.id);
        track = tracks.find(t => t.id === currentRound.trackId) || null;
        correctPlayerIds = track?.sourceUserIds || [];
      }

      // Get answers for results
      const answers = currentRound ? await storage.getAnswersByRound(currentRound.id) : [];

      const playersWithAnswers = room.players.map(p => {
        const answer = answers.find(a => a.oderId === p.userId);
        return {
          id: p.userId,
          displayName: p.user.displayName,
          uniqueName: p.user.uniqueName,
          totalScore: p.totalScore || 0,
          answered: gameState?.answeredUsers.has(p.userId) || false,
          lastAnswer: answer ? {
            selectedUserIds: answer.selectedUserIds,
            isCorrect: answer.isCorrect || false,
            isPartialCorrect: answer.isPartialCorrect || false,
            score: answer.score || 0,
          } : undefined,
        };
      });

      // Only show correct answers during results phase
      const showCorrectAnswers = gameState?.status === "results";

      // Refresh player data for accurate scores during results
      let freshPlayers = playersWithAnswers;
      if (showCorrectAnswers) {
        const refreshedRoom = await storage.getRoomWithPlayers(code.toUpperCase());
        if (refreshedRoom) {
          freshPlayers = refreshedRoom.players.map(p => {
            const answer = answers.find(a => a.oderId === p.userId);
            return {
              id: p.userId,
              displayName: p.user.displayName,
              uniqueName: p.user.uniqueName,
              totalScore: p.totalScore || 0,
              answered: true,
              lastAnswer: answer ? {
                selectedUserIds: answer.selectedUserIds,
                isCorrect: answer.isCorrect || false,
                isPartialCorrect: answer.isPartialCorrect || false,
                score: answer.score || 0,
              } : undefined,
            };
          });
        }
      }

      // Get current round time limit
      const currentRoundNumber = room.currentRound || 0;
      const roundTimeLimit = getRoundTimeLimit(currentRoundNumber);

      // Get player streaks
      const playerStreaks: Record<string, number> = {};
      if (gameState?.playerStreaks) {
        gameState.playerStreaks.forEach((streak, oderId) => {
          playerStreaks[oderId] = streak;
        });
      }

      res.json({
        roomId: room.id,
        roomName: room.name,
        status: gameState?.status || "waiting",
        currentRound: currentRoundNumber,
        totalRounds: room.totalRounds || 10,
        timeLeft: gameState?.timeLeft || roundTimeLimit,
        totalTime: roundTimeLimit,
        isLightningRound: gameState?.isLightningRound || false,
        playerStreaks,
        track: track ? {
          id: track.id,
          spotifyTrackId: track.trackId,
          name: track.trackName,
          artist: track.artistName,
          albumArt: track.albumArtUrl,
          previewUrl: track.previewUrl,
        } : null,
        players: freshPlayers,
        correctPlayerIds: showCorrectAnswers ? correctPlayerIds : [],
      });
    } catch (error) {
      console.error("Get game state error:", error);
      res.status(500).json({ error: "Oyun durumu alınamadı" });
    }
  });

  // Submit answer
  app.post("/api/rooms/:code/answer", async (req, res) => {
    try {
      const { code } = req.params;
      const { userId, selectedUserIds } = req.body;

      const room = await storage.getRoomByCode(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      const gameState = gameStates.get(code.toUpperCase());
      if (!gameState || gameState.status !== "question") {
        return res.status(400).json({ error: "Şu anda cevap verilemez" });
      }

      if (gameState.answeredUsers.has(userId)) {
        return res.status(400).json({ error: "Zaten cevap verdiniz" });
      }

      const currentRound = await storage.getCurrentRound(room.id);
      if (!currentRound) {
        return res.status(400).json({ error: "Aktif tur bulunamadı" });
      }

      // Save answer
      await storage.createAnswer({
        roundId: currentRound.id,
        oderId: userId,
        selectedUserIds: selectedUserIds || [],
      });

      gameState.answeredUsers.add(userId);

      // Check if all players answered
      const players = await storage.getRoomPlayers(room.id);
      if (gameState.answeredUsers.size >= players.length) {
        endRound(code.toUpperCase());
      }

      broadcastToRoom(code.toUpperCase(), { type: "player_answered", userId });
      res.json({ success: true });
    } catch (error) {
      console.error("Submit answer error:", error);
      res.status(500).json({ error: "Cevap gönderilemedi" });
    }
  });

  // Get final results
  app.get("/api/rooms/:code/results", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomWithPlayers(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      const players = room.players.map(p => ({
        id: p.userId,
        displayName: p.user.displayName,
        uniqueName: p.user.uniqueName,
        avatarUrl: p.user.avatarUrl || null,
        totalScore: p.totalScore || 0,
        correctAnswers: 0,
        partialAnswers: 0,
      }));

      res.json({
        roomName: room.name,
        totalRounds: room.currentRound || 0,
        players,
      });
    } catch (error) {
      console.error("Get results error:", error);
      res.status(500).json({ error: "Sonuçlar alınamadı" });
    }
  });

  // Rematch - reset room for new game
  app.post("/api/rooms/:code/rematch", async (req, res) => {
    try {
      const { code } = req.params;
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ error: "userId gerekli" });
      }

      const room = await storage.getRoomByCode(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      if (room.status !== "finished") {
        return res.status(400).json({ error: "Oyun henüz bitmedi" });
      }

      // Verify the user is the host
      if (room.hostUserId !== userId) {
        return res.status(403).json({ error: "Sadece host yeni oyun başlatabilir" });
      }

      // Reset room state
      await storage.updateRoom(room.id, {
        status: "waiting",
        currentRound: 0,
      });

      // Reset player scores
      await storage.resetPlayerScores(room.id);

      // Clear game state
      gameStates.delete(code.toUpperCase());

      // Broadcast to all players
      broadcastToRoom(code.toUpperCase(), { type: "rematch_started" });

      res.json({ success: true });
    } catch (error) {
      console.error("Rematch error:", error);
      res.status(500).json({ error: "Rematch başlatılamadı" });
    }
  });

  // Helper functions for game flow
  async function startNextRound(roomCode: string) {
    const room = await storage.getRoomByCode(roomCode);
    if (!room) return;

    const gameState = gameStates.get(roomCode);
    if (!gameState) return;

    const newRoundNumber = (room.currentRound || 0) + 1;

    if (newRoundNumber > (room.totalRounds || 10)) {
      // Game finished - keep room in finished state until new game starts
      await storage.updateRoom(room.id, { status: "finished" });
      gameState.status = "finished";
      broadcastToRoom(roomCode, { type: "game_finished" });
      return;
    }

    // Get all tracks for this room
    const allTracks = await storage.getTracksByRoom(room.id);
    let track: Track | null = null;
    
    // Filter unused tracks
    let availableTracks = allTracks.filter(t => !gameState.usedTrackIds.has(t.id));
    
    // If all tracks used, reset
    if (availableTracks.length === 0) {
      gameState.usedTrackIds.clear();
      availableTracks = allTracks;
    }
    
    if (availableTracks.length > 0) {
      // Every 2 rounds (rounds 2, 4, 6, 8, 10), prefer multi-owner songs
      const preferMultiOwner = newRoundNumber % 2 === 0;
      
      if (preferMultiOwner) {
        // Find tracks with multiple owners
        const multiOwnerTracks = availableTracks.filter(t => t.sourceUserIds.length > 1);
        if (multiOwnerTracks.length > 0) {
          // Random selection from multi-owner tracks
          track = multiOwnerTracks[Math.floor(Math.random() * multiOwnerTracks.length)];
        }
      }
      
      // If no multi-owner track found or odd round, pick random
      if (!track) {
        track = availableTracks[Math.floor(Math.random() * availableTracks.length)];
      }
      
      if (track) {
        gameState.usedTrackIds.add(track.id);
      }
    }
    
    if (!track) {
      // No tracks available - mark game as finished
      await storage.updateRoom(room.id, { status: "finished" });
      gameState.status = "finished";
      broadcastToRoom(roomCode, { type: "game_finished" });
      return;
    }

    // Create new round
    const round = await storage.createRound({
      roomId: room.id,
      roundNumber: newRoundNumber,
      trackId: track.id,
      correctUserIds: track.sourceUserIds,
      startedAt: new Date(),
      endedAt: null,
    });

    await storage.updateRoom(room.id, { currentRound: newRoundNumber });

    // Check if this is a lightning round
    const lightning = isLightningRound(newRoundNumber);
    const timeLimit = getRoundTimeLimit(newRoundNumber);

    // Update game state
    gameState.status = "question";
    gameState.currentRound = newRoundNumber;
    gameState.timeLeft = timeLimit;
    gameState.trackId = track.id;
    gameState.roundStartTime = Date.now();
    gameState.answeredUsers = new Set();
    gameState.isLightningRound = lightning;

    broadcastToRoom(roomCode, { 
      type: "round_started", 
      round: newRoundNumber,
      isLightningRound: lightning,
      timeLimit,
    });

    // Start timer with correct time limit
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.roundStartTime!) / 1000);
      gameState.timeLeft = Math.max(0, timeLimit - elapsed);

      if (gameState.timeLeft <= 0) {
        clearInterval(timer);
        endRound(roomCode);
      }
    }, 1000);
  }

  async function endRound(roomCode: string) {
    const room = await storage.getRoomByCode(roomCode);
    if (!room) return;

    const gameState = gameStates.get(roomCode);
    if (!gameState || gameState.status !== "question") return;

    gameState.status = "results";

    const currentRound = await storage.getCurrentRound(room.id);
    if (!currentRound) return;

    const track = (await storage.getTracksByRoom(room.id)).find(t => t.id === currentRound.trackId);
    const correctUserIds = track?.sourceUserIds || [];

    // Calculate scores with streak bonus and lightning multiplier
    const answers = await storage.getAnswersByRound(currentRound.id);
    const players = await storage.getRoomPlayers(room.id);
    const isLightning = gameState.isLightningRound;

    for (const answer of answers) {
      const selected = answer.selectedUserIds || [];
      const correct = new Set(correctUserIds);

      let correctCount = 0;
      let wrongCount = 0;

      for (const selectedId of selected) {
        if (correct.has(selectedId)) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }

      // Base score calculation
      let baseScore = (correctCount * 5) - (wrongCount * 5);
      const isCorrect = correctCount === correct.size && wrongCount === 0;
      const isPartialCorrect = correctCount > 0 && !isCorrect;

      // Apply lightning round 2x multiplier
      if (isLightning) {
        baseScore = baseScore * 2;
      }

      // Track streak and apply bonus
      const userId = answer.oderId;
      const currentStreak = gameState.playerStreaks.get(userId) || 0;
      let streakBonus = 0;

      if (isCorrect || isPartialCorrect) {
        // Increment streak for correct answers
        const newStreak = currentStreak + 1;
        gameState.playerStreaks.set(userId, newStreak);
        
        // +10 bonus for 3+ streak
        if (newStreak >= 3) {
          streakBonus = 10;
        }
      } else {
        // Reset streak on wrong answer
        gameState.playerStreaks.set(userId, 0);
      }

      const finalScore = baseScore + streakBonus;

      await storage.updateAnswer(answer.id, { isCorrect, isPartialCorrect, score: finalScore });

      // Update player score
      const player = players.find(p => p.userId === answer.oderId);
      if (player) {
        await storage.updatePlayerScore(player.id, (player.totalScore || 0) + finalScore);
      }
    }

    await storage.updateRound(currentRound.id, { endedAt: new Date() });

    broadcastToRoom(roomCode, { type: "round_ended" });

    // Start next round after showing results
    setTimeout(() => startNextRound(roomCode), 5000);
  }

  return httpServer;
}
