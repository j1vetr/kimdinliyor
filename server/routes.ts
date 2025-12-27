import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, generateUniqueRoomCode, generateUniqueName, hashPassword, verifyPassword } from "./storage";
import { getGoogleAuthUrl, exchangeCodeForTokens, refreshAccessToken, getLikedVideosWithStats, getSubscriptionsWithStats, getUserProfile } from "./youtube";
import type { Room, RoomPlayer, Content } from "@shared/schema";

// WebSocket connections by room code
const roomConnections = new Map<string, Set<WebSocket>>();

// Game state management
interface GameState {
  status: "waiting" | "question" | "results" | "finished";
  currentRound: number;
  timeLeft: number;
  contentId: string | null;
  roundStartTime: number | null;
  answeredUsers: Set<string>;
  usedContentIds: Set<string>;
  contentsByOwner: Map<string, string[]>;
  lastOwnerIndex: number;
  isLightningRound: boolean;
  playerStreaks: Map<string, number>;
  gameModes: string[];
  currentGameMode: string | null;
}

const gameStates = new Map<string, GameState>();

// Helper: Check if round is lightning round (every 5th round: 5, 10)
function isLightningRound(roundNumber: number): boolean {
  return roundNumber % 5 === 0 && roundNumber > 0;
}

// Scoring tiers for numeric modes based on percentage error
interface NumericScoreResult {
  basePoints: number;
  percentageError: number;
  tier: string;
  isCorrectForStreak: boolean;
}

function scoreNumericGuess(actual: number, guess: number): NumericScoreResult {
  if (actual <= 0) {
    return { basePoints: 0, percentageError: 100, tier: "invalid", isCorrectForStreak: false };
  }
  
  const percentageError = Math.abs(guess - actual) / actual * 100;
  
  let basePoints: number;
  let tier: string;
  let isCorrectForStreak: boolean;
  
  if (percentageError <= 5) {
    basePoints = 10;
    tier = "efsane";
    isCorrectForStreak = true;
  } else if (percentageError <= 15) {
    basePoints = 8;
    tier = "harika";
    isCorrectForStreak = true;
  } else if (percentageError <= 30) {
    basePoints = 6;
    tier = "iyi";
    isCorrectForStreak = true;
  } else if (percentageError <= 50) {
    basePoints = 4;
    tier = "yakin";
    isCorrectForStreak = false;
  } else if (percentageError <= 80) {
    basePoints = 2;
    tier = "uzak";
    isCorrectForStreak = false;
  } else if (percentageError <= 150) {
    basePoints = 1;
    tier = "riskli";
    isCorrectForStreak = false;
  } else if (percentageError <= 200) {
    basePoints = 0;
    tier = "miss";
    isCorrectForStreak = false;
  } else {
    basePoints = -2;
    tier = "wildMiss";
    isCorrectForStreak = false;
  }
  
  return { basePoints, percentageError, tier, isCorrectForStreak };
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

      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());
          
          if (message.type === "reaction") {
            broadcastToRoom(roomCode, {
              type: "reaction",
              userId: message.userId,
              displayName: message.displayName,
              avatarUrl: message.avatarUrl,
              emoji: message.emoji,
              timestamp: Date.now(),
            });
          }
        } catch (e) {
          console.error("WS message parse error:", e);
        }
      });

      ws.on("close", () => {
        roomConnections.get(roomCode)?.delete(ws);
      });
    }
  });

  // Google OAuth - Check user connection status
  app.get("/api/google/status", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== "string") {
        return res.json({ connected: false });
      }
      const token = await storage.getGoogleToken(userId);
      res.json({ connected: !!token });
    } catch (error) {
      res.json({ connected: false });
    }
  });

  // Google OAuth - Get auth URL for a user
  app.get("/api/google/auth-url", async (req, res) => {
    try {
      const { userId, roomCode } = req.query;
      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId gerekli" });
      }
      const state = `${userId}:${roomCode || ""}`;
      const authUrl = getGoogleAuthUrl(state);
      res.json({ authUrl });
    } catch (error) {
      res.status(500).json({ error: "Google auth error" });
    }
  });

  // Google OAuth - Callback
  app.get("/api/auth/google/callback", async (req, res) => {
    try {
      const { code, state, error } = req.query;
      
      if (error) {
        return res.redirect("/?google_error=access_denied");
      }

      if (!code || typeof code !== "string" || !state || typeof state !== "string") {
        return res.redirect("/?google_error=invalid_request");
      }

      const [userId, roomCode] = state.split(":");
      
      const tokens = await exchangeCodeForTokens(code);
      if (!tokens) {
        return res.redirect("/?google_error=token_exchange_failed");
      }

      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);
      await storage.saveGoogleToken(userId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
      });

      // Fetch and save user profile (avatar)
      const profile = await getUserProfile(tokens.accessToken);
      await storage.updateUser(userId, { 
        googleConnected: true,
        avatarUrl: profile?.avatarUrl || null
      });

      if (roomCode) {
        return res.redirect(`/oyun/${roomCode}/lobi?google_connected=true`);
      }
      return res.redirect("/?google_connected=true");
    } catch (error) {
      console.error("Google callback error:", error);
      res.redirect("/?google_error=callback_failed");
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
          hostUserId: room.hostUserId,
        },
        status: room.status,
        hostUserId: room.hostUserId,
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
      const { name, maxPlayers, totalRounds, roundDuration, isPublic, password, gameModes } = req.body;

      if (!name || name.trim().length === 0) {
        return res.status(400).json({ error: "Oda adı gerekli" });
      }

      const code = await generateUniqueRoomCode();
      const passwordHash = password ? await hashPassword(password) : null;

      // Validate game modes
      const validModes = ["who_liked", "who_subscribed", "view_count", "which_more", "subscriber_count"];
      const selectedModes = Array.isArray(gameModes) && gameModes.length > 0
        ? gameModes.filter((m: string) => validModes.includes(m))
        : ["who_liked", "who_subscribed"];

      const room = await storage.createRoom({
        code,
        name: name.trim(),
        maxPlayers: maxPlayers || 8,
        isPublic: isPublic !== false,
        passwordHash,
        hostUserId: null,
        totalRounds: totalRounds || 10,
        roundDuration: roundDuration || 20,
        gameModes: selectedModes,
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
      
      // Create user (Google not connected yet - will connect via OAuth)
      const user = await storage.createUser({
        displayName: displayName.trim(),
        uniqueName,
        googleConnected: false,
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

      const players = await storage.getRoomPlayers(room.id);
      const requesterInRoom = players.some(p => p.userId === requesterId);
      if (!requesterInRoom) {
        return res.status(403).json({ error: "Bu odada değilsiniz" });
      }

      if (room.hostUserId !== requesterId) {
        return res.status(403).json({ error: "Sadece host oyuncu atabilir" });
      }

      if (requesterId === targetUserId) {
        return res.status(400).json({ error: "Kendinizi atamazsınız" });
      }

      if (room.status === "playing") {
        return res.status(400).json({ error: "Oyun sırasında oyuncu atılamaz" });
      }

      const targetInRoom = players.some(p => p.userId === targetUserId);
      if (!targetInRoom) {
        return res.status(404).json({ error: "Oyuncu bulunamadı" });
      }

      await storage.removePlayerFromRoom(room.id, targetUserId);
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

      // Check if all players have Google connected
      const playersWithUsers = await storage.getRoomWithPlayers(code.toUpperCase());
      const disconnectedPlayers = playersWithUsers?.players.filter(p => !p.user.googleConnected) || [];
      if (disconnectedPlayers.length > 0) {
        const names = disconnectedPlayers.map(p => p.user.displayName).join(", ");
        return res.status(400).json({ 
          error: `Tüm oyuncuların YouTube bağlaması gerekli. Bağlanmayanlar: ${names}` 
        });
      }

      // Reset player scores for new game
      await storage.resetPlayerScores(room.id);
      
      // Fetch content from each player's YouTube account
      await storage.clearRoomContent(room.id);
      
      const contentByUser = new Map<string, { content: any; userId: string; type: string }[]>();
      
      console.log(`[GAME START] Fetching content for ${players.length} players`);
      
      for (const player of players) {
        try {
          let token = await storage.getGoogleToken(player.userId);
          if (!token) {
            console.log(`[GAME START] No token found for player ${player.userId}`);
            continue;
          }

          console.log(`[GAME START] Token found for player ${player.userId}, expires at: ${token.expiresAt}`);

          // Refresh token if expired
          if (token.expiresAt < new Date()) {
            console.log(`[GAME START] Token expired for player ${player.userId}, refreshing...`);
            const refreshed = await refreshAccessToken(token.refreshToken);
            if (refreshed) {
              const newExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
              await storage.saveGoogleToken(player.userId, {
                accessToken: refreshed.accessToken,
                refreshToken: token.refreshToken,
                expiresAt: newExpiresAt,
              });
              token = { ...token, accessToken: refreshed.accessToken, expiresAt: newExpiresAt };
              console.log(`[GAME START] Token refreshed for player ${player.userId}`);
            } else {
              console.log(`[GAME START] Token refresh FAILED for player ${player.userId}`);
              continue;
            }
          }

          // Fetch liked videos and subscriptions with stats (viewCount, subscriberCount)
          const likedVideos = await getLikedVideosWithStats(token.accessToken, 50);
          const subscriptions = await getSubscriptionsWithStats(token.accessToken, 50);
          
          console.log(`[GAME START] Fetched ${likedVideos.length} liked videos and ${subscriptions.length} subscriptions for player ${player.userId}`);
          
          // Add videos to pool
          for (const video of likedVideos) {
            const key = `video:${video.id}`;
            if (!contentByUser.has(key)) {
              contentByUser.set(key, []);
            }
            const existing = contentByUser.get(key)!;
            if (!existing.some(e => e.userId === player.userId)) {
              existing.push({ content: video, userId: player.userId, type: "video" });
            }
          }
          
          // Add channels to pool
          for (const channel of subscriptions) {
            const key = `channel:${channel.id}`;
            if (!contentByUser.has(key)) {
              contentByUser.set(key, []);
            }
            const existing = contentByUser.get(key)!;
            if (!existing.some(e => e.userId === player.userId)) {
              existing.push({ content: channel, userId: player.userId, type: "channel" });
            }
          }
        } catch (error) {
          console.error(`[GAME START] Failed to fetch content for user ${player.userId}:`, error);
        }
      }
      
      console.log(`[GAME START] Total unique content in pool: ${contentByUser.size}`);

      // Add content to cache with actual users
      if (contentByUser.size > 0) {
        for (const [key, entries] of Array.from(contentByUser.entries())) {
          const content = entries[0].content;
          const type = entries[0].type;
          const users = entries.map(e => e.userId);

          await storage.addContent({
            roomId: room.id,
            contentId: content.id,
            contentType: type,
            title: content.title,
            subtitle: type === "video" ? content.channelTitle : content.subscriberCount,
            thumbnailUrl: content.thumbnailUrl,
            sourceUserIds: users,
            viewCount: type === "video" ? content.viewCount : null,
            subscriberCount: type === "channel" ? content.subscriberCount : null,
          });
        }
      } else {
        // Create demo content if no YouTube content available
        const demoContent = [
          { id: "demo1", title: "Demo Video 1", subtitle: "Demo Channel", type: "video", viewCount: "1500000", subscriberCount: null },
          { id: "demo2", title: "Demo Video 2", subtitle: "Demo Channel", type: "video", viewCount: "2300000", subscriberCount: null },
          { id: "demo3", title: "Demo Kanal 1", subtitle: "1M abone", type: "channel", viewCount: null, subscriberCount: "1000000" },
        ];

        for (const content of demoContent) {
          const numUsers = Math.floor(Math.random() * players.length) + 1;
          const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
          const users = shuffledPlayers.slice(0, numUsers).map(p => p.userId);

          await storage.addContent({
            roomId: room.id,
            contentId: content.id,
            contentType: content.type,
            title: content.title,
            subtitle: content.subtitle,
            thumbnailUrl: null,
            sourceUserIds: users,
            viewCount: content.viewCount,
            subscriberCount: content.subscriberCount,
          });
        }
      }

      // Build content by owner for fair distribution
      const contents = await storage.getContentByRoom(room.id);
      const contentsByOwner = new Map<string, string[]>();
      
      for (const content of contents) {
        const primaryOwner = content.sourceUserIds[0];
        if (primaryOwner) {
          if (!contentsByOwner.has(primaryOwner)) {
            contentsByOwner.set(primaryOwner, []);
          }
          contentsByOwner.get(primaryOwner)!.push(content.id);
        }
      }

      // Initialize game state with game modes from room
      const roomModes = room.gameModes || ["who_liked", "who_subscribed"];
      gameStates.set(code.toUpperCase(), {
        status: "waiting",
        currentRound: 0,
        timeLeft: room.roundDuration || 20,
        contentId: null,
        roundStartTime: null,
        answeredUsers: new Set(),
        usedContentIds: new Set(),
        contentsByOwner,
        lastOwnerIndex: -1,
        isLightningRound: false,
        playerStreaks: new Map(),
        gameModes: roomModes,
        currentGameMode: null,
      });

      // Update room status
      await storage.updateRoom(room.id, { status: "playing", currentRound: 0 });

      // Start first round immediately (no delay)
      await startNextRound(code.toUpperCase(), room);

      res.json({ success: true });
    } catch (error) {
      console.error("Start game error:", error);
      res.status(500).json({ error: "Oyun başlatılamadı" });
    }
  });

  // Helper function to start the next round
  async function startNextRound(roomCode: string, room: Room) {
    const gameState = gameStates.get(roomCode);
    if (!gameState) return;

    const nextRound = gameState.currentRound + 1;
    const totalRounds = room.totalRounds || 10;

    if (nextRound > totalRounds) {
      // Game finished
      gameState.status = "finished";
      await storage.updateRoom(room.id, { status: "finished" });
      broadcastToRoom(roomCode, { type: "game_finished" });
      return;
    }

    // Get all room content for shared content selection
    const allContents = await storage.getContentByRoom(room.id);
    const unusedContents = allContents.filter(c => !gameState.usedContentIds.has(c.id));
    
    if (unusedContents.length === 0) {
      // No more content, end game
      gameState.status = "finished";
      await storage.updateRoom(room.id, { status: "finished" });
      broadcastToRoom(roomCode, { type: "game_finished" });
      return;
    }

    // Separate shared content (multiple users) from single-user content
    const sharedContents = unusedContents.filter(c => c.sourceUserIds && c.sourceUserIds.length > 1);
    const singleUserContents = unusedContents.filter(c => !c.sourceUserIds || c.sourceUserIds.length === 1);
    
    let selectedContentId: string;
    
    // 35% chance to select shared content if available (more fun when multiple players could be correct)
    const useSharedContent = sharedContents.length > 0 && Math.random() < 0.35;
    
    if (useSharedContent) {
      // Select random shared content
      const randomIndex = Math.floor(Math.random() * sharedContents.length);
      selectedContentId = sharedContents[randomIndex].id;
    } else {
      // Use round-robin owner selection for fair distribution
      const ownersWithContent: string[] = [];
      const contentsByOwnerEntries = Array.from(gameState.contentsByOwner.entries());
      for (const [owner, contentIds] of contentsByOwnerEntries) {
        const unused = contentIds.filter((id: string) => !gameState.usedContentIds.has(id));
        if (unused.length > 0) {
          ownersWithContent.push(owner);
        }
      }

      if (ownersWithContent.length === 0) {
        // Fallback: select random from all unused
        const randomIndex = Math.floor(Math.random() * unusedContents.length);
        selectedContentId = unusedContents[randomIndex].id;
      } else {
        // Round-robin owner selection
        gameState.lastOwnerIndex = (gameState.lastOwnerIndex + 1) % ownersWithContent.length;
        const selectedOwner = ownersWithContent[gameState.lastOwnerIndex];
        
        // Get unused content from this owner
        const ownerContentIds = gameState.contentsByOwner.get(selectedOwner) || [];
        const unusedOwnerContentIds = ownerContentIds.filter(id => !gameState.usedContentIds.has(id));
        
        if (unusedOwnerContentIds.length === 0) {
          // Fallback: select random from all unused
          const randomIndex = Math.floor(Math.random() * unusedContents.length);
          selectedContentId = unusedContents[randomIndex].id;
        } else {
          // Select random content from this owner
          const randomIndex = Math.floor(Math.random() * unusedOwnerContentIds.length);
          selectedContentId = unusedOwnerContentIds[randomIndex];
        }
      }
    }
    
    gameState.usedContentIds.add(selectedContentId);

    // Get content details
    const content = await storage.getContentById(selectedContentId);
    if (!content) {
      setTimeout(() => startNextRound(roomCode, room), 100);
      return;
    }

    // Check if lightning round
    const lightning = isLightningRound(nextRound);
    const roundDuration = lightning ? 10 : (room.roundDuration || 20);

    // Select random game mode from enabled modes
    // Filter modes based on content type
    const contentType = content.contentType;
    let availableModes = gameState.gameModes.filter(mode => {
      if (mode === "who_liked" || mode === "view_count") return contentType === "video";
      if (mode === "who_subscribed" || mode === "subscriber_count") return contentType === "channel";
      if (mode === "which_more") return true; // Works with both
      return true;
    });
    
    // Fallback to basic modes if no modes available for this content type
    if (availableModes.length === 0) {
      availableModes = contentType === "video" ? ["who_liked"] : ["who_subscribed"];
    }
    
    // Select random mode
    const selectedMode = availableModes[Math.floor(Math.random() * availableModes.length)];

    // Update game state
    gameState.currentRound = nextRound;
    gameState.status = "question";
    gameState.contentId = selectedContentId;
    gameState.timeLeft = roundDuration;
    gameState.roundStartTime = Date.now();
    gameState.answeredUsers = new Set();
    gameState.isLightningRound = lightning;
    gameState.currentGameMode = selectedMode;

    // Create round in database
    await storage.createRound({
      roomId: room.id,
      roundNumber: nextRound,
      gameMode: selectedMode,
      contentId: selectedContentId,
      correctUserIds: content.sourceUserIds,
      correctAnswer: content.viewCount || content.subscriberCount || null,
      startedAt: new Date(),
    });

    // Update room
    await storage.updateRoom(room.id, { currentRound: nextRound });

    // Broadcast round start
    broadcastToRoom(roomCode, {
      type: "round_started",
      round: nextRound,
      totalRounds,
      gameMode: selectedMode,
      content: {
        id: content.id,
        contentId: content.contentId,
        contentType: content.contentType,
        title: content.title,
        subtitle: content.subtitle,
        thumbnailUrl: content.thumbnailUrl,
        viewCount: content.viewCount,
        subscriberCount: content.subscriberCount,
      },
      timeLimit: roundDuration,
      isLightningRound: lightning,
    });

    // Start timer
    const timerInterval = setInterval(async () => {
      const currentState = gameStates.get(roomCode);
      if (!currentState || currentState.status !== "question") {
        clearInterval(timerInterval);
        return;
      }

      currentState.timeLeft--;
      
      if (currentState.timeLeft <= 0) {
        clearInterval(timerInterval);
        await endRound(roomCode, room);
      }
    }, 1000);
  }

  // Helper function to end the current round
  async function endRound(roomCode: string, room: Room) {
    const gameState = gameStates.get(roomCode);
    if (!gameState) return;

    gameState.status = "results";

    // Get current round
    const currentRound = await storage.getCurrentRound(room.id);
    if (!currentRound) return;

    // Get content for this round
    const content = currentRound.contentId ? await storage.getContentById(currentRound.contentId) : null;
    const correctUserIds = content?.sourceUserIds || [];

    // Calculate scores for all answers
    const answers = await storage.getAnswersByRound(currentRound.id);
    const players = await storage.getRoomPlayers(room.id);
    const scoreMultiplier = gameState.isLightningRound ? 2 : 1;

    const roundResults: any[] = [];
    const isNumericMode = gameState.currentGameMode === "view_count" || gameState.currentGameMode === "subscriber_count";

    // For numeric modes, get the correct answer value
    let correctAnswer: number | null = null;
    if (isNumericMode && content) {
      if (gameState.currentGameMode === "view_count") {
        correctAnswer = typeof content.viewCount === 'string' ? parseInt(content.viewCount) : (content.viewCount || 0);
      } else if (gameState.currentGameMode === "subscriber_count") {
        correctAnswer = typeof content.subscriberCount === 'string' ? parseInt(content.subscriberCount) : (content.subscriberCount || 0);
      }
    }

    // For numeric modes, find the best guess to award bonus
    let bestGuessOderId: string | null = null;
    let bestPercentageError = Infinity;
    if (isNumericMode && correctAnswer !== null && correctAnswer > 0) {
      for (const answer of answers) {
        if (answer.numericAnswer) {
          const guess = parseInt(answer.numericAnswer);
          if (!isNaN(guess)) {
            const percentageError = Math.abs(guess - correctAnswer) / correctAnswer * 100;
            if (percentageError < bestPercentageError) {
              bestPercentageError = percentageError;
              bestGuessOderId = answer.oderId;
            }
          }
        }
      }
    }

    for (const player of players) {
      const answer = answers.find(a => a.oderId === player.userId);
      let score = 0;
      let isCorrect = false;
      let isPartialCorrect = false;
      let percentageError: number | null = null;
      let tier: string | null = null;

      if (answer) {
        if (isNumericMode && correctAnswer !== null) {
          // Numeric mode scoring
          const guess = answer.numericAnswer ? parseInt(answer.numericAnswer) : 0;
          const scoreResult = scoreNumericGuess(correctAnswer, guess);
          
          score = scoreResult.basePoints * scoreMultiplier;
          percentageError = scoreResult.percentageError;
          tier = scoreResult.tier;
          isCorrect = scoreResult.isCorrectForStreak;
          
          // Best guess bonus (+1)
          if (player.userId === bestGuessOderId && answers.length > 1) {
            score += 1 * scoreMultiplier;
          }
          
          // Streak bonus
          const currentStreak = gameState.playerStreaks.get(player.userId) || 0;
          if (isCorrect) {
            const newStreak = currentStreak + 1;
            gameState.playerStreaks.set(player.userId, newStreak);
            if (newStreak >= 3) {
              score += 10 * scoreMultiplier;
            }
          } else {
            gameState.playerStreaks.set(player.userId, 0);
          }
        } else {
          // Player selection mode scoring
          const selectedIds = answer.selectedUserIds || [];
          const correctSet = new Set(correctUserIds);

          let correctCount = 0;
          let incorrectCount = 0;
          for (const id of selectedIds) {
            if (correctSet.has(id)) {
              correctCount++;
            } else {
              incorrectCount++;
            }
          }

          score = (correctCount * 5 - incorrectCount * 5) * scoreMultiplier;
          isCorrect = correctCount === correctUserIds.length && incorrectCount === 0;
          isPartialCorrect = correctCount > 0 && !isCorrect;

          // Streak bonus
          const currentStreak = gameState.playerStreaks.get(player.userId) || 0;
          if (isCorrect || isPartialCorrect) {
            const newStreak = currentStreak + 1;
            gameState.playerStreaks.set(player.userId, newStreak);
            if (newStreak >= 3) {
              score += 10 * scoreMultiplier;
            }
          } else {
            gameState.playerStreaks.set(player.userId, 0);
          }
        }

        // Update answer
        await storage.updateAnswer(answer.id, { isCorrect, isPartialCorrect, score });
      } else {
        // No answer submitted
        gameState.playerStreaks.set(player.userId, 0);
      }

      // Update player score
      const newTotalScore = (player.totalScore || 0) + score;
      await storage.updatePlayerScore(player.id, newTotalScore);

      const playerAnswer = answers.find(a => a.oderId === player.userId);
      roundResults.push({
        oderId: player.userId,
        displayName: player.user.displayName,
        avatarUrl: player.user.avatarUrl,
        selectedUserIds: playerAnswer?.selectedUserIds || [],
        numericAnswer: playerAnswer?.numericAnswer || null,
        percentageError,
        tier,
        isBestGuess: player.userId === bestGuessOderId,
        score,
        isCorrect,
        isPartialCorrect,
        totalScore: newTotalScore,
        streak: gameState.playerStreaks.get(player.userId) || 0,
      });
    }

    // Update round end time
    await storage.updateRound(currentRound.id, { endedAt: new Date() });

    // Broadcast round results
    broadcastToRoom(roomCode, {
      type: "round_ended",
      correctUserIds,
      correctAnswer: isNumericMode ? correctAnswer : null,
      gameMode: gameState.currentGameMode,
      results: roundResults,
      isLightningRound: gameState.isLightningRound,
    });

    // Start next round after delay
    setTimeout(() => startNextRound(roomCode, room), 5000);
  }

  // Submit answer
  app.post("/api/rooms/:code/answer", async (req, res) => {
    try {
      const { code } = req.params;
      const { oderId, selectedUserIds, numericAnswer } = req.body;

      if (!oderId) {
        return res.status(400).json({ error: "Gerekli bilgiler eksik" });
      }

      const room = await storage.getRoomByCode(code.toUpperCase());
      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      const gameState = gameStates.get(code.toUpperCase());
      if (!gameState || gameState.status !== "question") {
        return res.status(400).json({ error: "Şu anda cevap verilemez" });
      }

      if (gameState.answeredUsers.has(oderId)) {
        return res.status(400).json({ error: "Zaten cevap verdiniz" });
      }

      const currentRound = await storage.getCurrentRound(room.id);
      if (!currentRound) {
        return res.status(400).json({ error: "Aktif tur bulunamadı" });
      }

      // Save answer with support for numeric answers
      await storage.createAnswer({
        roundId: currentRound.id,
        oderId,
        selectedUserIds: selectedUserIds || [],
        numericAnswer: numericAnswer || null,
      });

      gameState.answeredUsers.add(oderId);

      // Broadcast that user answered
      broadcastToRoom(code.toUpperCase(), {
        type: "player_answered",
        oderId,
      });

      // Check if all players answered
      const players = await storage.getRoomPlayers(room.id);
      if (gameState.answeredUsers.size >= players.length) {
        // End round early
        await endRound(code.toUpperCase(), room);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Submit answer error:", error);
      res.status(500).json({ error: "Cevap gönderilemedi" });
    }
  });

  // Get game state
  app.get("/api/rooms/:code/game", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomWithPlayers(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      const gameState = gameStates.get(code.toUpperCase());
      const currentRound = await storage.getCurrentRound(room.id);
      
      let content = null;
      if (currentRound?.contentId) {
        content = await storage.getContentById(currentRound.contentId);
      }

      res.json({
        room,
        gameState: gameState ? {
          status: gameState.status,
          currentRound: gameState.currentRound,
          timeLeft: gameState.timeLeft,
          isLightningRound: gameState.isLightningRound,
          gameMode: gameState.currentGameMode,
        } : null,
        currentRound,
        content: content ? {
          id: content.id,
          contentId: content.contentId,
          contentType: content.contentType,
          title: content.title,
          subtitle: content.subtitle,
          thumbnailUrl: content.thumbnailUrl,
        } : null,
      });
    } catch (error) {
      console.error("Get game state error:", error);
      res.status(500).json({ error: "Oyun durumu alınamadı" });
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

      // Sort players by score
      const sortedPlayers = [...room.players].sort((a, b) => (b.totalScore || 0) - (a.totalScore || 0));

      res.json({
        roomName: room.name,
        totalRounds: room.totalRounds || 10,
        hostUserId: room.hostUserId,
        players: sortedPlayers.map((p, index) => ({
          rank: index + 1,
          id: p.userId,
          displayName: p.user.displayName,
          uniqueName: p.user.uniqueName,
          avatarUrl: p.user.avatarUrl,
          totalScore: p.totalScore || 0,
          correctAnswers: 0,
          partialAnswers: 0,
        })),
      });
    } catch (error) {
      console.error("Get results error:", error);
      res.status(500).json({ error: "Sonuçlar alınamadı" });
    }
  });

  // Return to lobby - end game and reset room to waiting
  app.post("/api/rooms/:code/return-lobby", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomByCode(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      // Reset room status to waiting
      await storage.updateRoom(room.id, { status: "waiting", currentRound: 0 });
      
      // Clear game state
      gameStates.delete(code.toUpperCase());

      // Broadcast return to lobby
      broadcastToRoom(code.toUpperCase(), { type: "return_to_lobby" });

      res.json({ success: true });
    } catch (error) {
      console.error("Return to lobby error:", error);
      res.status(500).json({ error: "Lobiye dönülemedi" });
    }
  });

  // Rematch - reset scores and go back to lobby
  app.post("/api/rooms/:code/rematch", async (req, res) => {
    try {
      const { code } = req.params;
      const room = await storage.getRoomByCode(code.toUpperCase());

      if (!room) {
        return res.status(404).json({ error: "Oda bulunamadı" });
      }

      // Reset player scores
      await storage.resetPlayerScores(room.id);
      
      // Clear content cache
      await storage.clearRoomContent(room.id);
      
      // Reset room status to waiting
      await storage.updateRoom(room.id, { status: "waiting", currentRound: 0 });
      
      // Clear game state
      gameStates.delete(code.toUpperCase());

      // Broadcast rematch
      broadcastToRoom(code.toUpperCase(), { type: "rematch_started" });

      res.json({ success: true });
    } catch (error) {
      console.error("Rematch error:", error);
      res.status(500).json({ error: "Rematch başlatılamadı" });
    }
  });

  return httpServer;
}
