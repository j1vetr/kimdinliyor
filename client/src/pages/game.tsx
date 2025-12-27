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
          {/* Ultra Compact Header */}
          <header className="shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-border/30 bg-card/50">
            {/* Left: Timer + Round */}
            <div className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${isTimeLow ? "bg-red-500/20 text-red-500" : "bg-primary/10 text-primary"}`}>
                <span className="text-xs font-bold">{timeLeft}</span>
              </div>
              <span className="text-xs text-muted-foreground">{currentRound}/{totalRounds}</span>
            </div>
            
            {/* Center: Mode */}
            <div className="flex items-center gap-1 px-2 py-0.5 rounded bg-muted/50">
              <ModeIcon className="h-3 w-3 text-muted-foreground" />
              <span className="text-[10px] font-medium text-muted-foreground">{modeInfo?.badge}</span>
              {isLightningRound && <Zap className="h-3 w-3 text-amber-500" />}
            </div>
            
            {/* Right: Visual indicator */}
            <div className={`w-2 h-2 rounded-full ${isTimeLow ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
          </header>

          {/* Main Content */}
          <main className="flex-1 flex flex-col min-h-0 overflow-hidden p-2">
            {isComparisonMode && content2 ? (
              /* Comparison Mode - Ultra Compact */
              <div className="flex-1 flex flex-col gap-2">
                {/* Question */}
                <p className="text-xs font-semibold text-center text-muted-foreground">{modeInfo?.question}</p>
                
                {/* VS Cards - Horizontal */}
                <div className="flex-1 flex items-center gap-1.5 min-h-0">
                  {/* Card 1 */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => !hasAnswered && setSelectedContentId(content.id)}
                    disabled={hasAnswered}
                    className={`flex-1 h-full flex flex-col rounded-md overflow-hidden transition-all ${
                      selectedContentId === content.id
                        ? "ring-2 ring-primary shadow-lg"
                        : "ring-1 ring-border/50 hover:ring-primary/50"
                    } ${hasAnswered ? "opacity-60" : ""}`}
                    data-testid="button-select-video-1"
                  >
                    <div className="relative flex-1 min-h-0">
                      {content.thumbnailUrl ? (
                        <img src={content.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <SiYoutube className="w-6 h-6 text-red-500/50" />
                        </div>
                      )}
                      {selectedContentId === content.id && (
                        <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                          <Check className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-1.5 bg-card/95 backdrop-blur-sm">
                      <p className="text-[10px] font-medium line-clamp-2 leading-tight">{content.title}</p>
                    </div>
                  </motion.button>

                  {/* VS Badge */}
                  <div className="shrink-0 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                    <span className="text-[8px] font-black text-white">VS</span>
                  </div>

                  {/* Card 2 */}
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => !hasAnswered && setSelectedContentId(content2.id)}
                    disabled={hasAnswered}
                    className={`flex-1 h-full flex flex-col rounded-md overflow-hidden transition-all ${
                      selectedContentId === content2.id
                        ? "ring-2 ring-primary shadow-lg"
                        : "ring-1 ring-border/50 hover:ring-primary/50"
                    } ${hasAnswered ? "opacity-60" : ""}`}
                    data-testid="button-select-video-2"
                  >
                    <div className="relative flex-1 min-h-0">
                      {content2.thumbnailUrl ? (
                        <img src={content2.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <SiYoutube className="w-6 h-6 text-red-500/50" />
                        </div>
                      )}
                      {selectedContentId === content2.id && (
                        <div className="absolute inset-0 bg-primary/40 flex items-center justify-center">
                          <Check className="h-6 w-6 text-white" />
                        </div>
                      )}
                    </div>
                    <div className="p-1.5 bg-card/95 backdrop-blur-sm">
                      <p className="text-[10px] font-medium line-clamp-2 leading-tight">{content2.title}</p>
                    </div>
                  </motion.button>
                </div>

                {/* Submit */}
                <div className="shrink-0">
                  {hasAnswered ? (
                    <div className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-emerald-500/10">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-500">Gönderildi</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full gap-1.5 bg-primary"
                      onClick={handleSubmitAnswer}
                      disabled={!selectedContentId || answerMutation.isPending}
                      data-testid="button-submit-comparison"
                    >
                      {answerMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      <span className="text-xs">{selectedContentId ? "Kilitle" : "Seç"}</span>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Player Selection Mode - Compact */
              <div className="flex-1 flex flex-col gap-2 min-h-0">
                {/* Content Preview - Compact */}
                <div className="shrink-0 flex items-center gap-2 p-2 rounded-md bg-card/50 border border-border/30">
                  <div className="relative w-12 h-12 rounded overflow-hidden shrink-0">
                    {content.thumbnailUrl ? (
                      <img src={content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <SiYoutube className="w-4 h-4 text-red-500" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold line-clamp-1">{content.title}</p>
                    <p className="text-[10px] text-muted-foreground">{modeInfo?.question}</p>
                  </div>
                  <button onClick={openYouTubeLink} className="shrink-0 p-1.5 rounded hover:bg-muted" data-testid="button-open-youtube-header">
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                </div>

                {/* Players Grid - Compact */}
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <div className="grid grid-cols-3 gap-1.5">
                    {allPlayers.map((player: any) => {
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
                          className={`relative flex flex-col items-center p-2 rounded-md transition-all ${
                            hasAnswered ? "opacity-50" : ""
                          } ${
                            isSelected 
                              ? "bg-primary text-white ring-1 ring-primary" 
                              : "bg-card hover:bg-muted ring-1 ring-border/30"
                          }`}
                          data-testid={`button-player-${playerId}`}
                        >
                          {isSelected && (
                            <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                              <Check className="h-2.5 w-2.5" />
                            </div>
                          )}
                          <div className="relative mb-1">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isSelected ? "bg-white/20" : "bg-muted"}`}>
                                {displayName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] font-medium text-center line-clamp-1 w-full">
                            {isSelf ? "Ben" : displayName?.split(' ')[0]}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <div className="shrink-0">
                  {hasAnswered ? (
                    <div className="flex items-center justify-center gap-1.5 py-2 rounded-md bg-emerald-500/10">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-xs font-semibold text-emerald-500">Kilitlendi</span>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      className="w-full gap-1.5 bg-primary"
                      onClick={handleSubmitAnswer}
                      disabled={selectedPlayers.length === 0 || answerMutation.isPending}
                      data-testid="button-submit-answer"
                    >
                      {answerMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      <span className="text-xs">{selectedPlayers.length === 0 ? "Seç" : `Kilitle (${selectedPlayers.length})`}</span>
                    </Button>
                  )}
                </div>
              </div>
            )}
          </main>

          {/* Time Warning */}
          {isTimeLow && <div className="h-0.5 bg-red-500 animate-pulse shrink-0" />}
        </div>
      )}

      {gameStatus === "results" && content && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Compact Header */}
          <header className="shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-border/30 bg-card/50">
            <span className="text-xs text-muted-foreground">{currentRound}/{totalRounds}</span>
            <span className="text-[10px] font-medium text-muted-foreground">Sonuçlar</span>
            {isLightningRound && <Zap className="h-3 w-3 text-amber-500" />}
          </header>

          <main className="flex-1 overflow-y-auto p-2">
            <div className="space-y-2">
              {/* Content Card - Compact */}
              <button 
                type="button"
                className="w-full flex items-center gap-2 p-2 rounded-md bg-card/50 border border-border/30 text-left"
                onClick={openYouTubeLink}
              >
                <div className="w-12 h-8 rounded overflow-hidden shrink-0">
                  {content.thumbnailUrl ? (
                    <img src={content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <SiYoutube className="w-4 h-4 text-red-500" />
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium line-clamp-1 flex-1">{content.title}</p>
                <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
              </button>

              {/* Correct Answer - Compact */}
              {isComparisonMode ? (
                <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className="w-10 h-6 rounded overflow-hidden shrink-0">
                        <img 
                          src={(correctContentId === content.id ? content : content2)?.thumbnailUrl || ''} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 line-clamp-1">
                        {(correctContentId === content.id ? content : content2)?.title}
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-2 rounded-md bg-emerald-500/10 border border-emerald-500/30">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                    {correctPlayerIds.length > 0 ? (
                      allPlayers
                        .filter((p: any) => correctPlayerIds.includes(p.userId || p.user?.id))
                        .map((player: any) => (
                          <span key={player.userId || player.user?.id} className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                            {player.user?.displayName || player.displayName}
                          </span>
                        ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground italic">Kimse</span>
                    )}
                  </div>
                </div>
              )}

              {/* Player Results - Compact List */}
              <div className="space-y-1">
                {[...roundResults].sort((a, b) => b.score - a.score).map((result, index) => {
                  const isSelf = result.oderId === userId;
                  const isTopScorer = index === 0 && result.score > 0;
                  
                  return (
                    <div 
                      key={result.oderId} 
                      className={`flex items-center gap-2 p-2 rounded-md ${
                        result.isCorrect 
                          ? "bg-emerald-500/10 border border-emerald-500/30" 
                          : result.isPartialCorrect 
                            ? "bg-amber-500/10 border border-amber-500/30"
                            : "bg-card/50 border border-border/30"
                      } ${isSelf ? "ring-1 ring-primary" : ""}`}
                    >
                      {/* Rank */}
                      <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center shrink-0">
                        {isTopScorer ? (
                          <Trophy className="h-3 w-3 text-amber-500" />
                        ) : (
                          <span className="text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                        )}
                      </div>
                      
                      {/* Avatar */}
                      {result.avatarUrl ? (
                        <img src={result.avatarUrl} alt="" className="w-6 h-6 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold shrink-0">
                          {result.displayName?.charAt(0).toUpperCase()}
                        </div>
                      )}
                      
                      {/* Name + Answer */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-xs font-semibold truncate">{result.displayName}</span>
                          {isSelf && <span className="text-[8px] text-primary">(Sen)</span>}
                          {result.streak >= 3 && <Flame className="h-3 w-3 text-orange-500" />}
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {isComparisonMode ? (
                            result.selectedContentId ? (
                              <span className={result.isCorrect ? "text-emerald-500" : "text-red-400"}>
                                {result.selectedContentId === content.id ? content.title?.slice(0, 20) : content2?.title?.slice(0, 20)}...
                              </span>
                            ) : "Cevapsız"
                          ) : (
                            result.selectedUserIds.length > 0 ? (
                              result.selectedUserIds.map((id) => getPlayerName(id)?.split(' ')[0]).join(', ')
                            ) : "Cevapsız"
                          )}
                        </div>
                      </div>
                      
                      {/* Score */}
                      <div className={`text-xs font-bold shrink-0 ${result.score > 0 ? "text-emerald-500" : result.score < 0 ? "text-red-400" : "text-muted-foreground"}`}>
                        {result.score > 0 ? `+${result.score}` : result.score}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Next Round Indicator */}
              <div className="flex items-center justify-center gap-2 py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">Sonraki tur...</span>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
