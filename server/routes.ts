import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, generateUniqueRoomCode, generateUniqueName, hashPassword, verifyPassword } from "./storage";
import { getSpotifyAuthUrl, exchangeCodeForTokens, refreshAccessToken, getRecentlyPlayedTracks, getTopTracks } from "./spotify";
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
}

const gameStates = new Map<string, GameState>();

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

      await storage.updateUser(userId, { spotifyConnected: true });

      if (roomCode) {
        return res.redirect(`/oyun/${roomCode}/lobby?spotify_connected=true`);
      }
      return res.redirect("/?spotify_connected=true");
    } catch (error) {
      console.error("Spotify callback error:", error);
      res.redirect("/?spotify_error=callback_failed");
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
      const { name, maxPlayers, isPublic, password } = req.body;

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
        totalRounds: 10,
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

      if (room.status !== "waiting") {
        return res.status(400).json({ error: "Oyun zaten başlamış" });
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

      res.json({
        roomId: room.id,
        roomName: room.name,
        status: gameState?.status || "waiting",
        currentRound: room.currentRound || 0,
        totalRounds: room.totalRounds || 10,
        timeLeft: gameState?.timeLeft || 20,
        track: track ? {
          id: track.id,
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

  // Helper functions for game flow
  async function startNextRound(roomCode: string) {
    const room = await storage.getRoomByCode(roomCode);
    if (!room) return;

    const gameState = gameStates.get(roomCode);
    if (!gameState) return;

    const newRoundNumber = (room.currentRound || 0) + 1;

    if (newRoundNumber > (room.totalRounds || 10)) {
      // Game finished
      await storage.updateRoom(room.id, { status: "finished" });
      gameState.status = "finished";
      broadcastToRoom(roomCode, { type: "game_finished" });
      return;
    }

    // Get random track
    const track = await storage.getRandomTrack(room.id);
    if (!track) {
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

    // Update game state
    gameState.status = "question";
    gameState.currentRound = newRoundNumber;
    gameState.timeLeft = 20;
    gameState.trackId = track.id;
    gameState.roundStartTime = Date.now();
    gameState.answeredUsers = new Set();

    broadcastToRoom(roomCode, { type: "round_started", round: newRoundNumber });

    // Start timer
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - gameState.roundStartTime!) / 1000);
      gameState.timeLeft = Math.max(0, 20 - elapsed);

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

    // Calculate scores
    const answers = await storage.getAnswersByRound(currentRound.id);
    const players = await storage.getRoomPlayers(room.id);

    for (const answer of answers) {
      const selected = new Set(answer.selectedUserIds);
      const correct = new Set(correctUserIds);

      let isCorrect = false;
      let isPartialCorrect = false;
      let score = 0;

      if (selected.size === correct.size && Array.from(selected).every(id => correct.has(id))) {
        isCorrect = true;
        score = 10;
      } else if (Array.from(selected).some(id => correct.has(id))) {
        isPartialCorrect = true;
        score = 5;
      } else {
        score = -2;
      }

      await storage.updateAnswer(answer.id, { isCorrect, isPartialCorrect, score });

      // Update player score
      const player = players.find(p => p.userId === answer.oderId);
      if (player) {
        await storage.updatePlayerScore(player.id, (player.totalScore || 0) + score);
      }
    }

    await storage.updateRound(currentRound.id, { endedAt: new Date() });

    broadcastToRoom(roomCode, { type: "round_ended" });

    // Start next round after showing results
    setTimeout(() => startNextRound(roomCode), 5000);
  }

  return httpServer;
}
