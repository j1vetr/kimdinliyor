import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Loader2, Users, Send, Check, Zap, Flame, Play, ThumbsUp, X, ExternalLink, Eye, UsersRound, Trophy, Clock, ArrowLeft, UserPlus, ChevronUp, ChevronDown, Minus, Smile, Mic2, Timer, Disc3 } from "lucide-react";
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

interface WSMessage {
  type: string;
  round?: number;
  totalRounds?: number;
  content?: Content;
  content2?: Content;
  timeLimit?: number;
  isLightningRound?: boolean;
  correctUserIds?: string[];
  correctContentId?: string;
  results?: RoundResult[];
  oderId?: string;
  gameMode?: GameMode;
  userId?: string;
  displayName?: string;
  avatarUrl?: string | null;
  emoji?: string;
  timestamp?: number;
}

export default function Game() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomCode = params.code?.toUpperCase();
  const userId = localStorage.getItem("userId");

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [totalTime, setTotalTime] = useState(20);
  const [gameStatus, setGameStatus] = useState<string>("waiting");
  const [currentRound, setCurrentRound] = useState(0);
  const [isLightningRound, setIsLightningRound] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [content2, setContent2] = useState<Content | null>(null);
  const [correctPlayerIds, setCorrectPlayerIds] = useState<string[]>([]);
  const [correctContentId, setCorrectContentId] = useState<string | null>(null);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("who_liked");
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [playerScores, setPlayerScores] = useState<Map<string, number>>(new Map());
  const wsRef = useRef<WebSocket | null>(null);
  
  // Determine if current mode is a comparison mode
  const isComparisonMode = gameMode === "which_older" || 
                          gameMode === "most_viewed" || 
                          gameMode === "which_longer" ||
                          gameMode === "which_more_subs" ||
                          gameMode === "which_more_videos";

  // Simple polling for game state - runs continuously when waiting
  useEffect(() => {
    if (!roomCode || gameStatus !== "waiting") return;
    
    const fetchGame = async () => {
      try {
        const response = await fetch(`/api/rooms/${roomCode}/game`);
        if (response.ok) {
          const data = await response.json();
          
          // Transition to question state when ready
          if (data.gameState?.status === "question" && data.content) {
            console.log("Transitioning to question");
            setGameStatus("question");
            setCurrentRound(data.gameState.currentRound || 1);
            setIsLightningRound(data.gameState.isLightningRound || false);
            setTimeLeft(data.gameState.timeLeft || 20);
            setTotalTime(data.gameState.timeLeft || 20);
            setContent(data.content);
            setContent2(data.content2 || null);
            if (data.gameState.gameMode) {
              setGameMode(data.gameState.gameMode);
            }
          } else if (data.gameState?.status === "results") {
            setGameStatus("results");
            setCurrentRound(data.gameState.currentRound || 1);
          }
        }
      } catch (err) {
        console.error("Game fetch error:", err);
      }
    };
    
    // Poll immediately and every 500ms
    fetchGame();
    const interval = setInterval(fetchGame, 500);
    
    return () => clearInterval(interval);
  }, [roomCode, gameStatus]);

  const gameQuery = useQuery<any>({
    queryKey: ["/api/rooms", roomCode, "game"],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}/game`);
      if (!response.ok) throw new Error("Oyun verisi alınamadı.");
      return response.json();
    },
    enabled: !!roomCode && !!userId,
    refetchInterval: 2000,
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
        
        switch (message.type) {
          case "round_started":
            // Apply round data immediately
            setGameStatus("question");
            setCurrentRound(message.round || 1);
            setIsLightningRound(message.isLightningRound || false);
            setContent(message.content || null);
            setContent2(message.content2 || null);
            setTimeLeft(message.timeLimit || 20);
            setTotalTime(message.timeLimit || 20);
            setHasAnswered(false);
            setSelectedPlayers([]);
            setSelectedContentId(null);
            setCorrectPlayerIds([]);
            setCorrectContentId(null);
            setRoundResults([]);
            setGameMode(message.gameMode || "who_liked");
            break;
            
          case "round_ended":
            setGameStatus("results");
            setCorrectPlayerIds(message.correctUserIds || []);
            setCorrectContentId(message.correctContentId || null);
            setRoundResults(message.results || []);
            if (message.results) {
              const newScores = new Map<string, number>();
              message.results.forEach((r: RoundResult) => {
                newScores.set(r.oderId, r.totalScore);
              });
              setPlayerScores(newScores);
            }
            break;
            
          case "game_finished":
            setLocation(`/oyun/${roomCode}/results`);
            break;
            
          case "player_answered":
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

  useEffect(() => {
    if (gameStatus !== "question") return;
    
    const timer = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStatus]);

  // gameQuery effect: Sync state for round transitions and results
  useEffect(() => {
    if (!gameQuery.data) return;
    
    const data = gameQuery.data;
    // Handle results state from query - also sync results data from polling
    if (data.gameState?.status === "results" && gameStatus !== "results") {
      setGameStatus("results");
      setCurrentRound(data.gameState.currentRound || 1);
      // Sync results data from polling fallback
      if (data.gameState.correctUserIds) {
        setCorrectPlayerIds(data.gameState.correctUserIds);
      }
      if (data.gameState.correctContentId !== undefined) {
        setCorrectContentId(data.gameState.correctContentId);
      }
      if (data.gameState.results) {
        setRoundResults(data.gameState.results);
        const newScores = new Map<string, number>();
        data.gameState.results.forEach((r: RoundResult) => {
          newScores.set(r.oderId, r.totalScore);
        });
        setPlayerScores(newScores);
      }
    }
    // Also update results data if already in results state but missing data
    if (data.gameState?.status === "results" && gameStatus === "results" && correctPlayerIds.length === 0 && data.gameState.correctUserIds?.length > 0) {
      setCorrectPlayerIds(data.gameState.correctUserIds);
      if (data.gameState.correctContentId !== undefined) {
        setCorrectContentId(data.gameState.correctContentId);
      }
      if (data.gameState.results) {
        setRoundResults(data.gameState.results);
        const newScores = new Map<string, number>();
        data.gameState.results.forEach((r: RoundResult) => {
          newScores.set(r.oderId, r.totalScore);
        });
        setPlayerScores(newScores);
      }
    }
    // Ensure content is set if missing during question phase
    if (data.gameState?.status === "question" && !content && data.content) {
      console.log("gameQuery: Setting missing content", data.content);
      setContent(data.content);
    }
  }, [gameQuery.data, gameStatus, content, correctPlayerIds.length]);

  useEffect(() => {
    const roomStatus = gameQuery.data?.room?.status;
    if (roomStatus === "finished" && roomCode) {
      setLocation(`/oyun/${roomCode}/results`);
    }
  }, [gameQuery.data?.room?.status, roomCode, setLocation]);

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
  const totalRounds = room?.totalRounds || 10;
  const modeInfo = GAME_MODE_INFO[gameMode];
  const ModeIcon = modeInfo?.icon || ThumbsUp;
  const timerPercentage = (timeLeft / totalTime) * 100;
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
      {gameStatus === "waiting" && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-12 w-12 border-4 border-primary/30 border-t-primary rounded-full"
          />
          <p className="text-muted-foreground">Oyun Yükleniyor...</p>
        </div>
      )}

      {gameStatus === "question" && content && (
        <div className="flex flex-col h-full overflow-hidden">
          {/* Compact Header Bar - Timer + Round + Mode */}
          <header className="shrink-0 flex items-center justify-between px-3 py-2 bg-gradient-to-r from-card/80 via-background to-card/80 border-b border-border/40">
            {/* Timer Circle - Compact */}
            <div className="flex items-center gap-2">
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
                  <circle cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/20" />
                  <motion.circle
                    cx="20" cy="20" r="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={100.5} strokeDashoffset={100.5 * (1 - timerPercentage / 100)}
                    className={isTimeLow ? "text-red-500" : "text-primary"}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-sm font-black ${isTimeLow ? "text-red-500" : ""}`}>{timeLeft}</span>
                </div>
              </div>
              <div className="hidden sm:block">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Tur</div>
                <div className="text-sm font-black leading-none">{currentRound}<span className="text-muted-foreground font-normal">/{totalRounds}</span></div>
              </div>
            </div>

            {/* Center - Content Type Badge */}
            <div className="flex items-center gap-2">
              {isLightningRound && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/15 border border-amber-500/30">
                  <Zap className="h-3 w-3 text-amber-500" />
                  <span className="text-[10px] font-bold text-amber-500">2x</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/40">
                <ModeIcon className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] font-medium">{modeInfo?.badge}</span>
              </div>
            </div>

            {/* Right - Equalizer Bars */}
            <div className="flex items-center gap-0.5">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ height: [3, 10 + Math.random() * 6, 3] }}
                  transition={{ duration: 0.3 + Math.random() * 0.2, repeat: Infinity, delay: i * 0.05 }}
                  className={`w-0.5 rounded-full ${isTimeLow ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ height: 3 }}
                />
              ))}
            </div>
          </header>

          {/* Main Content Area - Flexible */}
          <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            {isComparisonMode && content2 ? (
              /* Comparison Mode UI - Two Videos Side by Side */
              <div className="flex-1 flex flex-col p-3 lg:p-4 min-h-0">
                {/* Question Prompt */}
                <div className="flex items-center gap-2 mb-3 shrink-0">
                  <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                    <ModeIcon className="h-3.5 w-3.5 text-white" />
                  </div>
                  <p className="text-sm font-bold flex-1">{modeInfo?.question}</p>
                </div>

                {/* Two Videos Side by Side */}
                <div className="flex-1 flex flex-col sm:flex-row gap-3 min-h-0">
                  {/* Video 1 */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => !hasAnswered && setSelectedContentId(content.id)}
                    disabled={hasAnswered}
                    className={`flex-1 flex flex-col rounded-xl p-3 border-2 transition-all ${
                      hasAnswered ? "opacity-60" : ""
                    } ${
                      selectedContentId === content.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card/80"
                    }`}
                    data-testid="button-select-video-1"
                  >
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-2 shrink-0">
                      {content.thumbnailUrl ? (
                        <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-500/5">
                          <SiYoutube className="w-10 h-10 text-red-500" />
                        </div>
                      )}
                      {selectedContentId === content.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold line-clamp-2 text-left">{content.title}</p>
                    {content.subtitle && <p className="text-[10px] text-muted-foreground line-clamp-1 text-left mt-0.5">{content.subtitle}</p>}
                  </motion.button>

                  {/* VS Divider */}
                  <div className="flex items-center justify-center shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                      <span className="text-xs font-black text-white">VS</span>
                    </div>
                  </div>

                  {/* Video 2 */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => !hasAnswered && setSelectedContentId(content2.id)}
                    disabled={hasAnswered}
                    className={`flex-1 flex flex-col rounded-xl p-3 border-2 transition-all ${
                      hasAnswered ? "opacity-60" : ""
                    } ${
                      selectedContentId === content2.id
                        ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                        : "border-border/50 bg-card/50 hover:border-primary/50 hover:bg-card/80"
                    }`}
                    data-testid="button-select-video-2"
                  >
                    <div className="relative aspect-video w-full rounded-lg overflow-hidden mb-2 shrink-0">
                      {content2.thumbnailUrl ? (
                        <img src={content2.thumbnailUrl} alt={content2.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-500/5">
                          <SiYoutube className="w-10 h-10 text-red-500" />
                        </div>
                      )}
                      {selectedContentId === content2.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                          <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-5 w-5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-bold line-clamp-2 text-left">{content2.title}</p>
                    {content2.subtitle && <p className="text-[10px] text-muted-foreground line-clamp-1 text-left mt-0.5">{content2.subtitle}</p>}
                  </motion.button>
                </div>

                {/* Submit Button for Comparison */}
                <div className="shrink-0 mt-3 pt-2 border-t border-border/20">
                  {hasAnswered ? (
                    <div className="flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                      <Check className="h-4 w-4 text-emerald-500" />
                      <span className="text-sm font-bold text-emerald-500">Gönderildi</span>
                    </div>
                  ) : (
                    <Button
                      className="w-full h-10 text-sm font-bold gap-2 bg-gradient-to-r from-primary to-red-600"
                      onClick={handleSubmitAnswer}
                      disabled={!selectedContentId || answerMutation.isPending}
                      data-testid="button-submit-comparison"
                    >
                      {answerMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          {selectedContentId ? "Kilitle" : "Video Seç"}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Player Selection Mode UI - Mixing Console Aesthetic */
              <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
                {/* Left: Media Section - Now Playing Slab */}
                <div className="flex-1 flex flex-col min-h-0 p-4 lg:p-6">
                  {/* Now Playing Header with Equalizer */}
                  <div className="flex items-center gap-3 mb-3 shrink-0">
                    <div className="relative h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-gradient-to-br from-primary via-red-500 to-red-600 flex items-center justify-center shadow-lg shadow-primary/30">
                      {content.contentType === "video" ? <Play className="h-5 w-5 lg:h-6 lg:w-6 text-white" /> : <SiYoutube className="h-5 w-5 lg:h-6 lg:w-6 text-white" />}
                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-primary">
                          {content.contentType === "video" ? "Şimdi Çalıyor" : "Kanal"}
                        </span>
                        <div className="flex items-center gap-0.5">
                          {[...Array(4)].map((_, i) => (
                            <motion.div
                              key={i}
                              animate={{ height: [4, 12 + Math.random() * 8, 4] }}
                              transition={{ duration: 0.4 + Math.random() * 0.3, repeat: Infinity, delay: i * 0.1 }}
                              className="w-1 rounded-full bg-gradient-to-t from-emerald-500 to-emerald-400"
                              style={{ height: 4 }}
                            />
                          ))}
                        </div>
                      </div>
                      <h2 className="text-base lg:text-xl xl:text-2xl font-black leading-tight line-clamp-2" data-testid="text-content-title">
                        {content.title}
                      </h2>
                      {content.subtitle && (
                        <p className="text-xs lg:text-sm text-muted-foreground line-clamp-1 mt-0.5">{content.subtitle}</p>
                      )}
                    </div>
                    <button 
                      onClick={openYouTubeLink} 
                      className="shrink-0 h-9 w-9 lg:h-10 lg:w-10 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors" 
                      data-testid="button-open-youtube-header"
                    >
                      <ExternalLink className="h-4 w-4 lg:h-5 lg:w-5 text-muted-foreground" />
                    </button>
                  </div>

                  {/* Media Display - Flexible Height */}
                  <div className="flex-1 flex items-center justify-center min-h-0">
                    {content.contentType === "video" ? (
                      <div className="relative w-full h-full max-h-[180px] lg:max-h-none lg:aspect-video rounded-2xl overflow-hidden ring-2 ring-primary/40 shadow-2xl shadow-primary/20" data-testid="video-player-container">
                        <iframe
                          src={`https://www.youtube.com/embed/${content.contentId}?autoplay=1&mute=0&controls=1&modestbranding=1&rel=0`}
                          title={content.title}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <button onClick={openYouTubeLink} className="relative group" data-testid="button-open-youtube">
                        <div className="w-28 h-28 lg:w-40 lg:h-40 xl:w-48 xl:h-48 rounded-2xl overflow-hidden ring-2 ring-primary/40 shadow-2xl shadow-primary/20 transition-transform group-hover:scale-105">
                          {content.thumbnailUrl ? (
                            <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover" data-testid="img-content-thumbnail" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-500/5">
                              <SiYoutube className="w-12 h-12 lg:w-16 lg:h-16 text-red-500" />
                            </div>
                          )}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                          <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-full bg-black/70 flex items-center justify-center backdrop-blur-sm">
                            <Play className="h-6 w-6 lg:h-7 lg:w-7 text-white fill-white" />
                          </div>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Vertical Divider - Desktop */}
                <div className="hidden lg:flex flex-col items-center py-6">
                  <div className="flex-1 w-px bg-gradient-to-b from-transparent via-border to-transparent" />
                  <div className="my-3 w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                    <Mic2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 w-px bg-gradient-to-b from-border via-border to-transparent" />
                </div>

                {/* Right: Selection Panel - Mixer Pad Style */}
                <div className="shrink-0 lg:w-80 xl:w-96 flex flex-col p-4 lg:p-6 bg-gradient-to-t lg:bg-gradient-to-l from-muted/20 to-transparent border-t lg:border-t-0">
                  {/* Question Prompt - Larger */}
                  <div className="flex items-center gap-3 mb-4 shrink-0">
                    <div className="h-10 w-10 lg:h-12 lg:w-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                      <ModeIcon className="h-5 w-5 lg:h-6 lg:w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <span className="text-[10px] lg:text-xs font-bold uppercase tracking-wider text-purple-500">Soru</span>
                      <p className="text-sm lg:text-base xl:text-lg font-bold">{modeInfo?.question}</p>
                    </div>
                  </div>

                  {/* Player Selection Grid - Mixer Pad Style */}
                  <div className="flex-1 min-h-0 overflow-y-auto">
                    <div className="grid grid-cols-2 lg:grid-cols-2 gap-2 lg:gap-3">
                      {allPlayers.map((player: any, index: number) => {
                        const playerId = player.userId || player.user?.id;
                        const displayName = player.user?.displayName || player.displayName;
                        const avatarUrl = player.user?.avatarUrl;
                        const isSelected = selectedPlayers.includes(playerId);
                        const isSelf = playerId === userId;
                        
                        return (
                          <motion.button
                            key={playerId}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => !hasAnswered && handlePlayerToggle(playerId, !isSelected)}
                            disabled={hasAnswered}
                            className={`relative flex flex-col items-center justify-center p-3 lg:p-4 rounded-xl transition-all ${
                              hasAnswered ? "opacity-50" : ""
                            } ${
                              isSelected 
                                ? "bg-gradient-to-br from-primary/90 to-red-600/90 text-white shadow-lg shadow-primary/40 ring-2 ring-primary/50" 
                                : "bg-card/80 hover:bg-card border border-border/50 hover:border-primary/50"
                            }`}
                            data-testid={`button-player-${playerId}`}
                          >
                            {/* Selection indicator */}
                            {isSelected && (
                              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                                <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                            
                            {/* Avatar */}
                            <div className={`relative mb-2 ${isSelected ? "ring-2 ring-white/30" : "ring-2 ring-border/30"} rounded-full`}>
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="w-10 h-10 lg:w-12 lg:h-12 rounded-full object-cover" />
                              ) : (
                                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-full flex items-center justify-center text-base lg:text-lg font-bold ${
                                  isSelected ? "bg-white/20 text-white" : "bg-muted text-foreground"
                                }`}>
                                  {displayName?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              {/* Online indicator */}
                              <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 ${
                                isSelected ? "border-primary bg-emerald-400" : "border-card bg-emerald-500"
                              }`} />
                            </div>
                            
                            {/* Name */}
                            <span className={`text-xs lg:text-sm font-semibold text-center line-clamp-1 ${
                              isSelected ? "text-white" : "text-foreground"
                            }`}>
                              {displayName}
                            </span>
                            {isSelf && (
                              <span className={`text-[10px] lg:text-xs ${isSelected ? "text-white/70" : "text-muted-foreground"}`}>
                                (Sen)
                              </span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button - Fixed at Bottom */}
                  <div className="shrink-0 mt-4 pt-3 border-t border-border/30">
                    {hasAnswered ? (
                      <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40">
                        <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-sm lg:text-base font-bold text-emerald-500">Kilitlendi</span>
                      </div>
                    ) : (
                      <Button
                        className="w-full h-11 lg:h-12 text-sm lg:text-base font-bold gap-2 bg-gradient-to-r from-primary to-red-600 shadow-lg shadow-primary/30"
                        onClick={handleSubmitAnswer}
                        disabled={selectedPlayers.length === 0 || answerMutation.isPending}
                        data-testid="button-submit-answer"
                      >
                        {answerMutation.isPending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <>
                            <Send className="h-5 w-5" />
                            {selectedPlayers.length === 0 ? "Oyuncu Seç" : `Kilitle (${selectedPlayers.length})`}
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </main>

          {/* Time Low Warning Bar */}
          {isTimeLow && (
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              className="h-0.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500 origin-left shrink-0"
            />
          )}
        </div>
      )}

      {gameStatus === "results" && content && (
        <div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-background to-background/95">
          <header className="relative flex items-center justify-center px-4 py-3 border-b border-border/50 shrink-0 bg-background/80 backdrop-blur-sm">
            <div className="absolute left-4">
              <Badge variant="outline" className="text-xs py-0.5 px-2.5 gap-1.5 bg-background/50">
                <span className="text-muted-foreground">Tur</span>
                <span className="font-bold">{currentRound}/{totalRounds}</span>
              </Badge>
            </div>
            <Logo height={32} showAnimation={false} />
            {isLightningRound && (
              <div className="absolute right-4">
                <Badge className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-500 border-yellow-500/40 text-xs py-0.5 px-2.5 gap-1.5">
                  <Zap className="h-3.5 w-3.5" />
                  2x Puan
                </Badge>
              </div>
            )}
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto space-y-5">
              <button 
                type="button"
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/50 hover:border-red-500/40 hover:bg-card transition-all text-left group shadow-lg"
                onClick={openYouTubeLink}
              >
                <div className="relative w-20 h-14 md:w-24 md:h-16 rounded-xl overflow-hidden shrink-0 ring-2 ring-red-500/30 shadow-md">
                  {content.thumbnailUrl ? (
                    <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-500/5">
                      <SiYoutube className="w-6 h-6 text-red-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                    <ExternalLink className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-[10px] py-0 px-1.5 gap-1">
                      {content.contentType === "video" ? <><Play className="h-2.5 w-2.5" /> Video</> : <><SiYoutube className="h-2.5 w-2.5" /> Kanal</>}
                    </Badge>
                  </div>
                  <p className="text-sm md:text-base font-bold line-clamp-2">{content.title}</p>
                </div>
              </button>

              <div className="relative p-5 rounded-2xl bg-gradient-to-br from-green-500/15 to-green-600/5 border border-green-500/40 shadow-lg overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="h-4 w-4 text-green-500" />
                    </div>
                    <h3 className="text-sm font-bold text-green-600 dark:text-green-400 uppercase tracking-wide">Doğru Cevap</h3>
                  </div>
                  {correctPlayerIds.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {allPlayers
                        .filter((p: any) => correctPlayerIds.includes(p.userId || p.user?.id))
                        .map((player: any) => {
                          const avatarUrl = player.user?.avatarUrl || player.avatarUrl;
                          const displayName = player.user?.displayName || player.displayName;
                          return (
                            <div key={player.userId || player.user?.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/20 backdrop-blur-sm border border-green-500/30">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-lg object-cover ring-1 ring-green-500/30" />
                              ) : (
                                <div className="w-7 h-7 rounded-lg bg-green-500/30 flex items-center justify-center text-xs font-bold text-green-700 dark:text-green-300">
                                  {displayName?.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <span className="text-sm font-semibold text-green-700 dark:text-green-300">{displayName}</span>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      {content.contentType === "video" ? "Bu videoyu kimse beğenmemiş." : "Bu kanala kimse abone değil."}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">
                    Oyuncu Tahminleri
                  </h3>
                  <Badge variant="outline" className="text-[10px] py-0 px-2">
                    {roundResults.length} oyuncu
                  </Badge>
                </div>
                
                {[...roundResults].sort((a, b) => b.score - a.score).map((result, index) => {
                  const isSelf = result.oderId === userId;
                  const isTopScorer = index === 0 && result.score > 0;
                  
                  return (
                    <div 
                      key={result.oderId} 
                      className={`relative p-4 rounded-2xl border backdrop-blur-sm transition-all ${
                        result.isCorrect 
                          ? "bg-green-500/10 border-green-500/40 shadow-green-500/5 shadow-lg" 
                          : result.isPartialCorrect 
                            ? "bg-yellow-500/10 border-yellow-500/40 shadow-yellow-500/5 shadow-lg"
                            : "bg-card/60 border-border/50"
                      } ${isSelf ? "ring-2 ring-red-500/30" : ""}`}
                    >
                      {isTopScorer && (
                        <div className="absolute -top-2 -right-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg">
                            <Trophy className="h-4 w-4 text-yellow-900" />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {result.avatarUrl ? (
                            <img src={result.avatarUrl} alt={result.displayName} className="w-12 h-12 rounded-xl object-cover ring-2 ring-border/50" />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-base font-bold">
                              {result.displayName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {result.streak >= 3 && (
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                              <Flame className="h-3 w-3 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-base font-bold truncate">{result.displayName}</span>
                            {isSelf && <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px] py-0">Sen</Badge>}
                            {result.streak >= 3 && (
                              <Badge className="bg-gradient-to-r from-orange-500/20 to-red-500/20 text-orange-500 border-orange-500/30 text-[10px] py-0 gap-1">
                                <Flame className="h-2.5 w-2.5" />
                                {result.streak} seri
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
                            {result.selectedUserIds.length > 0 ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {result.selectedUserIds.map((selectedId) => {
                                  const isCorrectSelection = correctPlayerIds.includes(selectedId);
                                  const selectedName = getPlayerName(selectedId);
                                  
                                  return (
                                    <span key={selectedId} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                                      isCorrectSelection 
                                        ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                                    }`}>
                                      {selectedName}
                                      {isCorrectSelection ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <span className="italic text-muted-foreground/60">Cevap vermedi</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 pl-3 border-l border-border/50">
                          <div className={`text-xl font-black ${
                            result.score > 0 ? "text-green-500" : result.score < 0 ? "text-red-500" : "text-muted-foreground"
                          }`}>
                            {result.score > 0 && "+"}{result.score}
                          </div>
                          <div className="text-xs text-muted-foreground font-medium">
                            Toplam: <span className="font-bold text-foreground">{result.totalScore}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-3 py-6">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border/50">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">Sonraki tur 5 saniye içinde başlıyor...</span>
                </div>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
