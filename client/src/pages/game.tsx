import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Loader2, Users, Send, Check, Zap, Flame, Play, ThumbsUp, X, ExternalLink, Eye, UsersRound, Trophy, Clock, ArrowLeft, UserPlus, ChevronUp, ChevronDown, Minus, Smile, Mic2, Timer, Disc3, Sparkles } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

const EMOJI_REACTIONS = ["👏", "😂", "😮", "🔥", "💀", "🎉"];

interface FloatingReaction {
  id: string;
  emoji: string;
  displayName: string;
  avatarUrl?: string | null;
  x: number;
  y: number;
}

interface Content {
  id: string;
  contentId: string;
  contentType: "video" | "channel";
  title: string;
  subtitle: string | null;
  thumbnailUrl: string | null;
  youtubeId?: string;
  viewCount?: string;
  subscriberCount?: string;
  publishedAt?: string;
  duration?: number;
  videoCount?: number;
}

type GameMode = "who_liked" | "who_subscribed" | "which_older" | "most_viewed" | "oldest_like" | "which_longer" | "which_more_subs" | "which_more_videos";

const GAME_MODE_INFO: Record<GameMode, { question: string; icon: any; badge: string }> = {
  who_liked: { question: "Bu videoyu kim beğenmiş?", icon: ThumbsUp, badge: "Kim Beğenmiş?" },
  who_subscribed: { question: "Bu kanala kim abone?", icon: UserPlus, badge: "Kim Abone?" },
  which_older: { question: "Hangisi daha eski?", icon: Clock, badge: "Hangisi Daha Eski?" },
  most_viewed: { question: "Hangisi daha çok izlenmiş?", icon: Eye, badge: "En Çok İzlenmiş" },
  oldest_like: { question: "Bu video kimin en eski beğenisi?", icon: Flame, badge: "Benim İlk Aşkım" },
  which_longer: { question: "Hangisi daha uzun?", icon: Timer, badge: "Hangisi Daha Uzun?" },
  which_more_subs: { question: "Hangisi daha popüler?", icon: Users, badge: "Daha Popüler?" },
  which_more_videos: { question: "Hangisi daha emektar?", icon: Disc3, badge: "Daha Emektar?" },
};

interface RoundResult {
  oderId: string;
  displayName: string;
  avatarUrl?: string | null;
  selectedUserIds: string[];
  selectedContentId?: string | null;
  score: number;
  isCorrect: boolean;
  isPartialCorrect: boolean;
  totalScore: number;
  streak: number;
}

type GamePhase = "waiting" | "question" | "reveal" | "intermission" | "finished";

interface RevealData {
  correctUserIds: string[];
  correctContentId: string | null;
  results: RoundResult[];
}

interface WSMessage {
  type: string;
  phase?: GamePhase;
  round?: number;
  totalRounds?: number;
  content?: Content;
  content2?: Content;
  phaseStartedAt?: number;
  phaseEndsAt?: number;
  isLightningRound?: boolean;
  revealData?: RevealData | null;
  gameMode?: GameMode;
  // Legacy support
  correctUserIds?: string[];
  correctContentId?: string;
  results?: RoundResult[];
  oderId?: string;
  userId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  emoji?: string;
  timestamp?: number;
}

// Snapshot of results data - immutable during results phase
interface ResultsSnapshot {
  round: number;
  content: Content;
  content2: Content | null;
  correctPlayerIds: string[];
  correctContentId: string | null;
  results: RoundResult[];
  gameMode: GameMode;
  isLightningRound: boolean;
}

export default function Game() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomCode = params.code?.toUpperCase();
  const userId = localStorage.getItem("userId");

  // NEW SIMPLIFIED STATE: Server-driven phases
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [phaseEndsAt, setPhaseEndsAt] = useState<number>(0);
  const [currentRound, setCurrentRound] = useState(0);
  const [totalRounds, setTotalRounds] = useState(10);
  const [isLightningRound, setIsLightningRound] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [content2, setContent2] = useState<Content | null>(null);
  const [gameMode, setGameMode] = useState<GameMode>("who_liked");
  const [revealData, setRevealData] = useState<RevealData | null>(null);
  
  // UI state
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [playerScores, setPlayerScores] = useState<Map<string, number>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  
  // Countdown derived from phaseEndsAt (updates every 100ms for smoothness)
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Update countdown from phaseEndsAt
  useEffect(() => {
    if (phase === "waiting" || phase === "finished") return;
    
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setTimeLeft(remaining);
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 100);
    return () => clearInterval(interval);
  }, [phase, phaseEndsAt]);
  
  // Determine if current mode is a comparison mode
  const isComparisonMode = gameMode === "which_older" || 
                          gameMode === "most_viewed" || 
                          gameMode === "which_longer" ||
                          gameMode === "which_more_subs" ||
                          gameMode === "which_more_videos";

  // Apply phase data from API or WebSocket
  const applyPhaseData = useCallback((data: any) => {
    if (!data.gameState) return;
    
    const gs = data.gameState;
    console.log("[PHASE] Applying phase data:", gs.phase, "round:", gs.currentRound);
    
    setPhase(gs.phase || "waiting");
    setPhaseEndsAt(gs.phaseEndsAt || Date.now());
    setCurrentRound(gs.currentRound || 0);
    setIsLightningRound(gs.isLightningRound || false);
    setGameMode(gs.gameMode || "who_liked");
    setRevealData(gs.revealData || null);
    
    if (data.content) setContent(data.content);
    if (data.content2) setContent2(data.content2);
    if (data.room?.totalRounds) setTotalRounds(data.room.totalRounds);
    
    // Update scores from reveal data
    if (gs.revealData?.results) {
      const newScores = new Map<string, number>();
      gs.revealData.results.forEach((r: RoundResult) => {
        newScores.set(r.oderId, r.totalScore);
      });
      setPlayerScores(newScores);
    }
    
    // Reset answer state on new question phase
    if (gs.phase === "question") {
      setHasAnswered(false);
      setSelectedPlayers([]);
      setSelectedContentId(null);
    }
  }, []);

  // Poll for initial game state when waiting
  useEffect(() => {
    if (!roomCode || phase !== "waiting") return;
    
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomCode}/game`);
        if (response.ok) {
          const data = await response.json();
          if (data.gameState?.phase && data.gameState.phase !== "waiting") {
            applyPhaseData(data);
          }
        }
      } catch (err) {
        console.error("Game fetch error:", err);
      }
    };
    
    fetchGame();
    const interval = setInterval(fetchGame, 500);
    return () => clearInterval(interval);
  }, [roomCode, phase, applyPhaseData]);

  const gameQuery = useQuery<any>({
    queryKey: ["/api/rooms", roomCode, "game"],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}/game`);
      if (!response.ok) throw new Error("Oyun verisi alınamadı.");
      return response.json();
    },
    enabled: !!roomCode && !!userId,
    refetchInterval: 500,
  });

  const answerMutation = useMutation({
    mutationFn: async (data: { selectedUserIds?: string[]; selectedContentId?: string }) => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/answer`, {
        oderId: userId,
        selectedUserIds: data.selectedUserIds || [],
        selectedContentId: data.selectedContentId || null,
      });
      return response.json();
    },
    onSuccess: () => {
      setHasAnswered(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Cevap gönderilemedi.",
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!roomCode) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws?room=${roomCode}`);
    wsRef.current = ws;

    ws.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        console.log("[WS] Received message:", message.type, message.phase);
        
        switch (message.type) {
          case "phase_changed":
            // NEW: Unified phase change handler
            console.log("[PHASE_CHANGED] Phase:", message.phase, "Round:", message.round);
            
            setPhase(message.phase || "waiting");
            setPhaseEndsAt(message.phaseEndsAt || Date.now());
            if (message.round) setCurrentRound(message.round);
            if (message.totalRounds) setTotalRounds(message.totalRounds);
            if (message.isLightningRound !== undefined) setIsLightningRound(message.isLightningRound);
            if (message.gameMode) setGameMode(message.gameMode);
            if (message.content) setContent(message.content);
            if (message.content2 !== undefined) setContent2(message.content2 || null);
            
            // Handle reveal data
            if (message.revealData) {
              setRevealData(message.revealData);
              // Update scores
              const newScores = new Map<string, number>();
              message.revealData.results.forEach((r: RoundResult) => {
                newScores.set(r.oderId, r.totalScore);
              });
              setPlayerScores(newScores);
            } else if (message.phase === "question") {
              // Clear reveal data and reset for new question
              setRevealData(null);
              setHasAnswered(false);
              setSelectedPlayers([]);
              setSelectedContentId(null);
            }
            break;
            
          case "game_finished":
            setPhase("finished");
            setLocation(`/oyun/${roomCode}/results`);
            break;
            
          case "player_answered":
            // Could show visual feedback that another player answered
            break;
            
          case "reaction":
            if (message.emoji && message.displayName) {
              const reactionId = `${message.userId}-${message.timestamp}`;
              const newReaction: FloatingReaction = {
                id: reactionId,
                emoji: message.emoji,
                displayName: message.displayName,
                avatarUrl: message.avatarUrl,
                x: 20 + Math.random() * 60,
                y: 100,
              };
              setFloatingReactions(prev => [...prev, newReaction]);
              setTimeout(() => {
                setFloatingReactions(prev => prev.filter(r => r.id !== reactionId));
              }, 3000);
            }
            break;
        }
      } catch (e) {
        console.error("WS message error:", e);
      }
    };

    return () => {
      ws.close();
    };
  }, [roomCode, setLocation]);

  // SIMPLIFIED: Sync from gameQuery for phase data (backup to WebSocket)
  useEffect(() => {
    if (!gameQuery.data) return;
    
    const data = gameQuery.data;
    const serverPhase = data.gameState?.phase;
    
    // Only apply if server has newer data
    if (serverPhase && serverPhase !== phase) {
      console.log("[Query] Syncing phase from polling:", serverPhase);
      applyPhaseData(data);
    }
    
    // Check for finished state
    if (data.room?.status === "finished" && roomCode) {
      setLocation(`/oyun/${roomCode}/results`);
    }
  }, [gameQuery.data, phase, roomCode, setLocation, applyPhaseData]);

  const handlePlayerToggle = useCallback((playerId: string, selected: boolean) => {
    if (hasAnswered) return;
    setSelectedPlayers((prev) =>
      selected ? [...prev, playerId] : prev.filter((id) => id !== playerId)
    );
  }, [hasAnswered]);

  const handleSubmitAnswer = useCallback(() => {
    if (isComparisonMode) {
      // Comparison mode: select content
      if (!selectedContentId) {
        toast({
          title: "Video seç",
          description: "Lütfen bir video seç.",
          variant: "destructive",
        });
        return;
      }
      answerMutation.mutate({ selectedContentId });
    } else {
      // Player selection mode
      if (selectedPlayers.length === 0) {
        toast({
          title: "Oyuncu seç",
          description: "En az bir oyuncu seçmelisin.",
          variant: "destructive",
        });
        return;
      }
      answerMutation.mutate({ selectedUserIds: selectedPlayers });
    }
  }, [selectedPlayers, selectedContentId, isComparisonMode, answerMutation, toast]);

  const openYouTubeLink = () => {
    if (content?.contentType === "video" && content?.contentId) {
      window.open(`https://www.youtube.com/watch?v=${content.contentId}`, "_blank");
    } else if (content?.contentType === "channel" && content?.contentId) {
      window.open(`https://www.youtube.com/channel/${content.contentId}`, "_blank");
    }
  };

  const getPlayerName = (playerId: string) => {
    const player = allPlayers.find((p: any) => (p.userId || p.user?.id) === playerId);
    return player?.user?.displayName || player?.displayName || "Bilinmeyen";
  };

  const getPlayerAvatar = (playerId: string) => {
    const player = allPlayers.find((p: any) => (p.userId || p.user?.id) === playerId);
    return player?.user?.avatarUrl || player?.avatarUrl || null;
  };

  if (gameQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Oyun yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (gameQuery.isError || !gameQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-sm overflow-visible">
          <CardContent className="p-6 text-center">
            <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
              <SiYoutube className="h-6 w-6 text-destructive" />
            </div>
            <h2 className="text-lg font-bold mb-2">Oyun Bulunamadı</h2>
            <p className="text-sm text-muted-foreground mb-4">Oyun verilerine ulaşılamadı.</p>
            <Link href="/">
              <Button size="sm" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Ana Sayfaya Dön
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const room = gameQuery.data.room;
  const allPlayers = room?.players || [];
  const modeInfo = GAME_MODE_INFO[gameMode];
  const ModeIcon = modeInfo?.icon || ThumbsUp;
  const roundDuration = room?.roundDuration || 20;
  const timerPercentage = (timeLeft / roundDuration) * 100;
  const isTimeLow = timeLeft <= 5;

  const sendReaction = (emoji: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const currentPlayer = allPlayers.find((p: any) => (p.userId || p.user?.id) === userId);
      const displayName = currentPlayer?.user?.displayName || currentPlayer?.displayName || "Oyuncu";
      const avatarUrl = currentPlayer?.user?.avatarUrl || currentPlayer?.avatarUrl;
      
      wsRef.current.send(JSON.stringify({
        type: "reaction",
        userId,
        displayName,
        avatarUrl,
        emoji,
      }));
    }
    setShowEmojiPicker(false);
  };

  const getSortedPlayersByScore = () => {
    return [...allPlayers].sort((a: any, b: any) => {
      const aId = a.userId || a.user?.id;
      const bId = b.userId || b.user?.id;
      const aScore = playerScores.get(aId) || a.totalScore || 0;
      const bScore = playerScores.get(bId) || b.totalScore || 0;
      return bScore - aScore;
    });
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden relative">
      {floatingReactions.map((reaction) => (
        <div
          key={reaction.id}
          className="fixed z-50 pointer-events-none animate-in fade-in zoom-in-50 duration-300"
          style={{
            left: `${reaction.x}%`,
            bottom: "20%",
            animation: "floatUp 3s ease-out forwards",
          }}
        >
          <div className="flex flex-col items-center gap-1 bg-card/90 backdrop-blur-sm rounded-2xl px-3 py-2 shadow-lg border border-border/50">
            <span className="text-2xl">{reaction.emoji}</span>
            <span className="text-[10px] font-medium text-muted-foreground truncate max-w-[80px]">{reaction.displayName}</span>
          </div>
        </div>
      ))}
      
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(1); opacity: 1; }
          100% { transform: translateY(-200px) scale(0.8); opacity: 0; }
        }
      `}</style>

      {/* Loading state while waiting for game data */}
      {phase === "waiting" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full"
          />
          <p className="text-muted-foreground">Oyun Yükleniyor...</p>
        </div>
      )}

      {/* Countdown screen - shows countdown before next question */}
      {phase === "intermission" && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            key={timeLeft}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <span className="text-8xl md:text-9xl font-bold text-primary">
              {timeLeft}
            </span>
            <p className="text-sm md:text-base text-muted-foreground font-medium">
              Sonraki Soru Geliyor...
            </p>
          </motion.div>
        </div>
      )}

      {/* VS Arena Mode - Full-screen immersive comparison */}
      {phase === "question" && content && isComparisonMode && content2 && (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Blurred Background - uses first content thumbnail */}
          <div className="absolute inset-0 z-0">
            <img 
              src={content.thumbnailUrl || content2.thumbnailUrl || ''} 
              alt="" 
              className="w-full h-full object-cover scale-110 blur-xl opacity-40"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/90" />
          </div>

          {/* Header - Compact on mobile */}
          <header className="shrink-0 px-3 py-2 md:px-4 md:py-3 relative z-10">
            <div className="max-w-[600px] mx-auto">
              {/* Combined row: Timer + Question + Round info */}
              <div className="flex items-center justify-between gap-2">
                {/* Timer - left */}
                <div className={`relative w-10 h-10 md:w-12 md:h-12 shrink-0 ${isTimeLow ? "animate-pulse" : ""}`}>
                  <svg className="w-full h-full -rotate-90 drop-shadow-lg" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="rgba(0,0,0,0.4)" stroke="currentColor" strokeWidth="2" className="text-white/20" />
                    <circle 
                      cx="24" cy="24" r="20" fill="none" strokeWidth="3" strokeLinecap="round"
                      className={isTimeLow ? "text-red-500" : "text-white"}
                      strokeDasharray={`${(timeLeft / (room?.roundDuration || 20)) * 125.7} 125.7`}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm md:text-base font-bold text-white drop-shadow-md ${isTimeLow ? "text-red-400" : ""}`}>
                    {timeLeft}
                  </span>
                </div>
                
                {/* Question - center */}
                <motion.p 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs md:text-sm font-bold text-foreground drop-shadow-lg text-center flex-1 px-2"
                >
                  {modeInfo?.question}
                </motion.p>
                
                {/* Round info - right */}
                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-black/30 backdrop-blur-md border border-white/10 shrink-0">
                  <span className="text-[10px] md:text-xs font-medium text-white/80">{currentRound}/{totalRounds}</span>
                  {isLightningRound && (
                    <Zap className="h-3 w-3 text-amber-400" />
                  )}
                </div>
              </div>
            </div>
          </header>

          {/* VS Arena - Main content - optimized for mobile viewport */}
          <main className="flex-1 flex flex-col md:flex-row items-center justify-center gap-2 md:gap-6 px-3 md:px-4 relative z-10 overflow-hidden">
            {/* Left Card - Red Team */}
            <motion.div
              initial={{ opacity: 0, x: -40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
              className="w-full md:w-auto md:flex-1 max-w-[260px] md:max-w-[320px]"
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => !hasAnswered && setSelectedContentId(content.id)}
                disabled={hasAnswered}
                className={`relative w-full rounded-lg md:rounded-xl overflow-hidden transition-all duration-300 ${
                  selectedContentId === content.id 
                    ? "ring-3 md:ring-4 ring-[hsl(var(--compare-left))] shadow-[0_0_30px_rgba(239,68,68,0.4)]" 
                    : "ring-2 ring-[hsl(var(--compare-left)/0.5)] hover:ring-[hsl(var(--compare-left)/0.8)]"
                } ${hasAnswered && selectedContentId !== content.id ? "opacity-40 grayscale" : ""}`}
                data-testid="button-select-video-1"
              >
                {/* Glow effect when selected */}
                {selectedContentId === content.id && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -inset-1 md:-inset-2 bg-[hsl(var(--compare-left-glow)/0.3)] rounded-xl md:rounded-2xl blur-lg md:blur-xl -z-10"
                  />
                )}
                
                {/* Video/Image with play button */}
                <div className="relative aspect-video bg-black">
                  {content.thumbnailUrl && (
                    <img src={content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  )}
                  {/* Play button overlay */}
                  {content.youtubeId && selectedContentId !== content.id && !hasAnswered && (
                    <a
                      href={`https://www.youtube.com/watch?v=${content.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                      data-testid="link-play-video-1"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                        <Play className="h-5 w-5 md:h-6 md:w-6 text-white ml-0.5" />
                      </div>
                    </a>
                  )}
                  {/* Selection overlay */}
                  {selectedContentId === content.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-[hsl(var(--compare-left)/0.6)] flex items-center justify-center"
                    >
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                        className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center"
                      >
                        <Check className="h-6 w-6 md:h-8 md:w-8 text-white" />
                      </motion.div>
                    </motion.div>
                  )}
                </div>
                
                {/* Title footer - more compact */}
                <div className="p-2 md:p-3 bg-gradient-to-t from-black/90 to-black/60 backdrop-blur-sm">
                  <p className="text-xs md:text-sm font-semibold text-white line-clamp-1 md:line-clamp-2">{content.title}</p>
                </div>
              </motion.button>
            </motion.div>

            {/* VS Badge - Center - smaller on mobile */}
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20, delay: 0.2 }}
              className="shrink-0 relative my-1 md:my-0"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full blur-md md:blur-lg opacity-60" />
              <div className="relative w-10 h-10 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 flex items-center justify-center shadow-xl md:shadow-2xl border-2 md:border-4 border-white/20">
                <Zap className="h-5 w-5 md:h-7 md:w-7 text-white drop-shadow-md" />
              </div>
            </motion.div>

            {/* Right Card - Blue Team */}
            <motion.div
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.15 }}
              className="w-full md:w-auto md:flex-1 max-w-[260px] md:max-w-[320px]"
            >
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => !hasAnswered && setSelectedContentId(content2.id)}
                disabled={hasAnswered}
                className={`relative w-full rounded-lg md:rounded-xl overflow-hidden transition-all duration-300 ${
                  selectedContentId === content2.id 
                    ? "ring-3 md:ring-4 ring-[hsl(var(--compare-right))] shadow-[0_0_30px_rgba(59,130,246,0.4)]" 
                    : "ring-2 ring-[hsl(var(--compare-right)/0.5)] hover:ring-[hsl(var(--compare-right)/0.8)]"
                } ${hasAnswered && selectedContentId !== content2.id ? "opacity-40 grayscale" : ""}`}
                data-testid="button-select-video-2"
              >
                {/* Glow effect when selected */}
                {selectedContentId === content2.id && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute -inset-1 md:-inset-2 bg-[hsl(var(--compare-right-glow)/0.3)] rounded-xl md:rounded-2xl blur-lg md:blur-xl -z-10"
                  />
                )}
                
                {/* Video/Image with play button */}
                <div className="relative aspect-video bg-black">
                  {content2.thumbnailUrl && (
                    <img src={content2.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  )}
                  {/* Play button overlay */}
                  {content2.youtubeId && selectedContentId !== content2.id && !hasAnswered && (
                    <a
                      href={`https://www.youtube.com/watch?v=${content2.youtubeId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                      data-testid="link-play-video-2"
                    >
                      <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                        <Play className="h-5 w-5 md:h-6 md:w-6 text-white ml-0.5" />
                      </div>
                    </a>
                  )}
                  {/* Selection overlay */}
                  {selectedContentId === content2.id && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="absolute inset-0 bg-[hsl(var(--compare-right)/0.6)] flex items-center justify-center"
                    >
                      <motion.div 
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 500 }}
                        className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center"
                      >
                        <Check className="h-6 w-6 md:h-8 md:w-8 text-white" />
                      </motion.div>
                    </motion.div>
                  )}
                </div>
                
                {/* Title footer - more compact */}
                <div className="p-2 md:p-3 bg-gradient-to-t from-black/90 to-black/60 backdrop-blur-sm">
                  <p className="text-xs md:text-sm font-semibold text-white line-clamp-1 md:line-clamp-2">{content2.title}</p>
                </div>
              </motion.button>
            </motion.div>
          </main>

          {/* Footer - Submit button - compact on mobile */}
          <footer className="shrink-0 px-3 py-2 md:px-4 md:pb-4 relative z-10">
            <div className="max-w-[300px] md:max-w-[440px] mx-auto">
              {hasAnswered ? (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 py-2 md:py-3 rounded-lg md:rounded-xl bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-sm"
                >
                  <Check className="h-4 w-4 md:h-5 md:w-5 text-emerald-400" />
                  <span className="text-xs md:text-sm font-bold text-emerald-400">Cevap Kilitlendi</span>
                </motion.div>
              ) : (
                <Button
                  className="w-full gap-2 text-sm md:text-base font-bold bg-gradient-to-r from-amber-500 to-orange-600 border-0 shadow-lg shadow-amber-500/25"
                  onClick={handleSubmitAnswer}
                  disabled={!selectedContentId || answerMutation.isPending}
                  data-testid="button-submit-comparison"
                >
                  {answerMutation.isPending ? (
                    <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4 md:h-5 md:w-5" />
                  )}
                  {selectedContentId ? "Cevabı Kilitle" : "Bir İçerik Seç"}
                </Button>
              )}
            </div>
          </footer>
        </div>
      )}

      {phase === "question" && content && !isComparisonMode && (
        <div className="flex flex-col h-full bg-gradient-to-b from-background to-background/95">
          {/* Premium Header Strip */}
          <header className="shrink-0 px-4 py-3">
            <div className="max-w-[340px] mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`relative w-10 h-10 ${isTimeLow ? "animate-pulse" : ""}`}>
                  <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                    <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted/20" />
                    <circle 
                      cx="20" cy="20" r="16" fill="none" strokeWidth="2.5" strokeLinecap="round"
                      className={isTimeLow ? "text-red-500" : "text-primary"}
                      strokeDasharray={`${(timeLeft / (room?.roundDuration || 20)) * 100.5} 100.5`}
                    />
                  </svg>
                  <span className={`absolute inset-0 flex items-center justify-center text-sm font-semibold ${isTimeLow ? "text-red-500" : ""}`}>
                    {timeLeft}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-foreground/80">Tur {currentRound}/{totalRounds}</span>
                  {isLightningRound && (
                    <span className="text-[10px] text-amber-500 font-medium flex items-center gap-0.5">
                      <Zap className="h-2.5 w-2.5" /> 2x Puan
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-muted/30 border border-border/20">
                <ModeIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{modeInfo?.badge}</span>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center min-h-0 overflow-hidden px-4 pb-4">
            <div className="w-full max-w-[340px] md:max-w-[440px] flex flex-col flex-1 min-h-0 gap-3 md:gap-4">
              {/* Content Card */}
                  <div className="shrink-0 rounded-lg bg-card/60 border border-border/20 backdrop-blur-sm overflow-hidden">
                    <div className="flex items-center gap-3 md:gap-4 p-3 md:p-4">
                      <div className="w-16 h-12 md:w-20 md:h-14 rounded-md overflow-hidden shrink-0 bg-muted">
                        {content.thumbnailUrl && (
                          <img src={content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs md:text-sm font-semibold line-clamp-2 leading-snug text-foreground/90">{content.title}</p>
                        <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{content.subtitle}</p>
                      </div>
                      <button onClick={openYouTubeLink} className="shrink-0 p-2 rounded-md hover:bg-muted/50 transition-colors" data-testid="button-open-youtube-header">
                        <ExternalLink className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                      </button>
                    </div>
                    <div className="px-3 py-2 md:px-4 md:py-3 bg-muted/30 border-t border-border/20">
                      <p className="text-xs md:text-sm font-medium text-center text-foreground/80">{modeInfo?.question}</p>
                    </div>
                  </div>

                  {/* Player Grid - 2 columns */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="grid grid-cols-2 gap-2 md:gap-3">
                      {allPlayers.map((player: any) => {
                        const playerId = player.userId || player.user?.id;
                        const displayName = player.user?.displayName || player.displayName;
                        const avatarUrl = player.user?.avatarUrl;
                        const isSelected = selectedPlayers.includes(playerId);
                        const isSelf = playerId === userId;
                        
                        return (
                          <motion.button
                            key={playerId}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => !hasAnswered && handlePlayerToggle(playerId, !isSelected)}
                            disabled={hasAnswered}
                            className={`flex items-center gap-2.5 md:gap-3 p-2.5 md:p-3 rounded-lg transition-all duration-200 min-h-[44px] md:min-h-[52px] ${
                              hasAnswered ? "opacity-50" : ""
                            } ${
                              isSelected 
                                ? "bg-primary text-primary-foreground ring-1 ring-primary shadow-md shadow-primary/20" 
                                : "bg-card/60 border border-border/20 hover:border-border/40"
                            }`}
                            data-testid={`button-player-${playerId}`}
                          >
                            <div className="relative shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="" className="w-8 h-8 md:w-10 md:h-10 rounded-full object-cover" />
                              ) : (
                                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${isSelected ? "bg-white/20" : "bg-muted"}`}>
                                  {displayName?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute -top-0.5 -right-0.5 w-4 h-4 md:w-5 md:h-5 rounded-full bg-white flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 md:h-3 md:w-3 text-primary" />
                                </div>
                              )}
                            </div>
                            <span className="text-xs md:text-sm font-medium truncate">
                              {isSelf ? "Ben" : displayName?.split(' ')[0]}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

              {/* CTA Footer */}
              <div className="shrink-0">
                {hasAnswered ? (
                  <div className="flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <Check className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
                    <span className="text-xs md:text-sm font-semibold text-emerald-500">Cevap Kilitlendi</span>
                  </div>
                ) : (
                  <Button
                    className="w-full h-11 md:h-12 gap-2 bg-primary hover:bg-primary/90 text-sm md:text-base font-semibold"
                    onClick={handleSubmitAnswer}
                    disabled={selectedPlayers.length === 0 || answerMutation.isPending}
                    data-testid="button-submit-answer"
                  >
                    {answerMutation.isPending ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
                    {selectedPlayers.length === 0 ? "Oyuncu Seç" : `Kilitle (${selectedPlayers.length})`}
                  </Button>
                )}
              </div>
            </div>
          </main>

          {isTimeLow && <div className="h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />}
        </div>
      )}

      {phase === "reveal" && revealData && content && (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Spotlight Background Effect - Tailwind compatible */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 pointer-events-none overflow-hidden"
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[340px] md:max-w-[440px] h-48 bg-emerald-500/8 rounded-full blur-3xl" />
          </motion.div>

          {/* Header Strip */}
          <header className="shrink-0 px-4 py-3 md:py-4 relative z-10">
            <div className="max-w-[340px] md:max-w-[440px] mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-medium text-foreground/80">Tur {currentRound}/{totalRounds}</span>
                {isLightningRound && (
                  <span className="text-[10px] md:text-xs text-amber-500 font-medium flex items-center gap-0.5">
                    <Zap className="h-2.5 w-2.5 md:h-3 md:w-3" /> 2x
                  </span>
                )}
              </div>
              <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40"
              >
                <Sparkles className="h-3 w-3 text-emerald-400" />
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wide">
                  Sonuç
                </span>
              </motion.div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 pb-4 relative z-10">
            <div className="max-w-[340px] md:max-w-[440px] mx-auto space-y-4 md:space-y-5">
              
              {/* Spotlight Answer Reveal */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="relative"
              >
                {/* Glow ring behind the card */}
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 via-emerald-400/30 to-emerald-500/20 rounded-xl blur-sm" />
                
                <div className="relative rounded-xl bg-gradient-to-b from-emerald-500/15 to-emerald-500/5 border border-emerald-500/30 overflow-hidden backdrop-blur-sm">
                  {/* Header with shine effect */}
                  <div className="relative px-4 py-2.5 bg-emerald-500/10 border-b border-emerald-500/20 overflow-hidden">
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "200%" }}
                      transition={{ duration: 1.5, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Doğru Cevap</span>
                    </div>
                  </div>
                  
                  {/* Answer Content */}
                  <div className="p-4">
                    {isComparisonMode && revealData.correctContentId ? (
                      <motion.button 
                        type="button"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="w-full flex items-center gap-4 text-left"
                        data-testid="button-correct-content-link"
                        onClick={() => {
                          const correctContent = revealData.correctContentId === content.id ? content : content2;
                          if (correctContent?.contentType === "video" && correctContent?.contentId) {
                            window.open(`https://www.youtube.com/watch?v=${correctContent.contentId}`, "_blank");
                          } else if (correctContent?.contentType === "channel" && correctContent?.contentId) {
                            window.open(`https://www.youtube.com/channel/${correctContent.contentId}`, "_blank");
                          }
                        }}
                      >
                        <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0 bg-muted ring-2 ring-emerald-500/40">
                          <img 
                            src={(revealData.correctContentId === content.id ? content : content2)?.thumbnailUrl || ''} 
                            alt="" 
                            className="w-full h-full object-cover" 
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground line-clamp-2">
                            {(revealData.correctContentId === content.id ? content : content2)?.title}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {(revealData.correctContentId === content.id ? content : content2)?.subtitle}
                          </p>
                        </div>
                        <ExternalLink className="h-4 w-4 text-emerald-400 shrink-0" />
                      </motion.button>
                    ) : (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                        className="flex items-center justify-center gap-3 flex-wrap py-2"
                      >
                        {revealData.correctUserIds.length > 0 ? (
                          allPlayers
                            .filter((p: any) => revealData.correctUserIds.includes(p.userId || p.user?.id))
                            .map((player: any, idx: number) => {
                              const avatarUrl = player.user?.avatarUrl;
                              const displayName = player.user?.displayName || player.displayName;
                              return (
                                <motion.div 
                                  key={player.userId || player.user?.id}
                                  initial={{ scale: 0, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: 0.3 + idx * 0.1, type: "spring", stiffness: 500 }}
                                  className="flex flex-col items-center gap-1.5"
                                  data-testid={`avatar-correct-player-${player.userId || player.user?.id}`}
                                >
                                  <div className="relative">
                                    <div className="absolute -inset-1 bg-emerald-500/30 rounded-full blur-sm" />
                                    {avatarUrl ? (
                                      <img src={avatarUrl} alt="" className="relative w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/50" />
                                    ) : (
                                      <div className="relative w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-lg font-bold text-emerald-400 ring-2 ring-emerald-500/50">
                                        {displayName?.charAt(0).toUpperCase()}
                                      </div>
                                    )}
                                  </div>
                                  <span className="text-xs font-semibold text-emerald-400">{displayName}</span>
                                </motion.div>
                              );
                            })
                        ) : (
                          <div className="flex items-center gap-2 py-2">
                            <Users className="h-5 w-5 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">Kimse beğenmemiş</span>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </div>
                </div>
              </motion.div>

              {/* Content Reference (smaller) */}
              <motion.button 
                type="button"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="w-full rounded-lg bg-card/40 border border-border/10 backdrop-blur-sm overflow-hidden text-left"
                data-testid="button-content-reference"
                onClick={() => {
                  if (content?.contentType === "video" && content?.contentId) {
                    window.open(`https://www.youtube.com/watch?v=${content.contentId}`, "_blank");
                  } else if (content?.contentType === "channel" && content?.contentId) {
                    window.open(`https://www.youtube.com/channel/${content.contentId}`, "_blank");
                  }
                }}
              >
                <div className="flex items-center gap-3 p-2.5">
                  <div className="w-12 h-8 rounded-md overflow-hidden shrink-0 bg-muted">
                    {content.thumbnailUrl && (
                      <img src={content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-medium line-clamp-1 text-foreground/80">{content.title}</p>
                    <p className="text-[10px] text-muted-foreground">{content.subtitle}</p>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                </div>
              </motion.button>

              {/* Player Results with staggered reveal */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="space-y-2"
              >
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Bu Tur</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{timeLeft}s</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[...revealData.results].sort((a, b) => b.score - a.score).map((result, index) => {
                    const isSelf = result.oderId === userId;
                    const isTopScorer = index === 0 && result.score > 0;
                    
                    return (
                      <motion.div 
                        key={result.oderId}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.08, type: "spring", stiffness: 300, damping: 25 }}
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                          result.isCorrect 
                            ? "bg-emerald-500/10 border border-emerald-500/25" 
                            : result.isPartialCorrect 
                              ? "bg-amber-500/10 border border-amber-500/25"
                              : "bg-card/50 border border-border/15"
                        } ${isSelf ? "ring-1 ring-primary/40" : ""}`}
                      >
                        {/* Rank Badge */}
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-[9px] font-bold ${
                          isTopScorer ? "bg-amber-500/30 text-amber-400" : "bg-muted/40 text-muted-foreground"
                        }`}>
                          {isTopScorer ? <Trophy className="h-3 w-3" /> : index + 1}
                        </div>
                        
                        {/* Avatar with effects */}
                        <div className="relative shrink-0">
                          {result.avatarUrl ? (
                            <img src={result.avatarUrl} alt="" className={`w-7 h-7 rounded-full object-cover ${result.isCorrect ? "ring-1 ring-emerald-500/50" : ""}`} />
                          ) : (
                            <div className={`w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold ${result.isCorrect ? "ring-1 ring-emerald-500/50" : ""}`}>
                              {result.displayName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {result.streak >= 3 && (
                            <motion.div 
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.8 + index * 0.1, type: "spring" }}
                              className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center"
                            >
                              <Flame className="h-2.5 w-2.5 text-white" />
                            </motion.div>
                          )}
                        </div>
                        
                        {/* Name & Status */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">{result.displayName}</span>
                            {isSelf && <span className="text-[9px] text-primary font-medium">(Sen)</span>}
                          </div>
                          <div className="flex items-center gap-1 mt-0.5">
                            {result.isCorrect ? (
                              <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-0.5">
                                <Check className="h-2.5 w-2.5" /> Doğru
                              </span>
                            ) : result.isPartialCorrect ? (
                              <span className="text-[10px] text-amber-500 font-medium">Kısmi doğru</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">
                                {isComparisonMode ? (
                                  result.selectedContentId ? "Yanlış" : "Pas"
                                ) : (
                                  result.selectedUserIds?.length > 0 ? "Yanlış" : "Pas"
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {/* Score with animation */}
                        <motion.div 
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.7 + index * 0.1, type: "spring", stiffness: 500 }}
                          className={`text-sm font-bold shrink-0 tabular-nums px-2 py-0.5 rounded-full ${
                            result.score > 0 
                              ? "text-emerald-400 bg-emerald-500/15" 
                              : result.score < 0 
                                ? "text-red-400 bg-red-500/15" 
                                : "text-muted-foreground bg-muted/30"
                          }`}
                        >
                          {result.score > 0 ? `+${result.score}` : result.score}
                        </motion.div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
              
              {/* Progress Indicator */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="pt-2"
              >
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: timeLeft, ease: "linear" }}
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full"
                  />
                </div>
              </motion.div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
