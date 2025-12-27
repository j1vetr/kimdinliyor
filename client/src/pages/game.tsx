import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Loader2, Users, Send, Check, Zap, Flame, Play, ThumbsUp, X, ExternalLink, Eye, UsersRound, Trophy, Clock, ArrowLeft, UserPlus, ChevronUp, ChevronDown, Minus, Smile, Radio, Tv, Signal, Mic2 } from "lucide-react";
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
}

type GameMode = "who_liked" | "who_subscribed" | "view_count" | "which_more" | "subscriber_count";

const GAME_MODE_INFO: Record<GameMode, { question: string; icon: any; badge: string }> = {
  who_liked: { question: "Bu videoyu kim beğenmiş?", icon: ThumbsUp, badge: "Video Beğeni" },
  who_subscribed: { question: "Bu kanala kim abone?", icon: UserPlus, badge: "Kanal Abonelik" },
  view_count: { question: "Bu videonun kaç izlenmesi var?", icon: Eye, badge: "İzlenme Tahmini" },
  which_more: { question: "Hangisi daha popüler?", icon: Trophy, badge: "Karşılaştırma" },
  subscriber_count: { question: "Bu kanalın kaç abonesi var?", icon: UsersRound, badge: "Abone Tahmini" },
};

interface RoundResult {
  oderId: string;
  displayName: string;
  avatarUrl?: string | null;
  selectedUserIds: string[];
  numericAnswer?: string | null;
  percentageError?: number | null;
  tier?: string | null;
  isBestGuess?: boolean;
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
  timeLimit?: number;
  isLightningRound?: boolean;
  correctUserIds?: string[];
  results?: RoundResult[];
  oderId?: string;
  gameMode?: GameMode;
  correctAnswer?: string;
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
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(20);
  const [totalTime, setTotalTime] = useState(20);
  const [gameStatus, setGameStatus] = useState<string>("waiting");
  const [currentRound, setCurrentRound] = useState(0);
  const [isLightningRound, setIsLightningRound] = useState(false);
  const [content, setContent] = useState<Content | null>(null);
  const [correctPlayerIds, setCorrectPlayerIds] = useState<string[]>([]);
  const [roundResults, setRoundResults] = useState<RoundResult[]>([]);
  const [gameMode, setGameMode] = useState<GameMode>("who_liked");
  const [numericAnswer, setNumericAnswer] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<string | null>(null);
  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [playerScores, setPlayerScores] = useState<Map<string, number>>(new Map());
  const [countdownNumber, setCountdownNumber] = useState<number | null>(null);
  const [countdownPhase, setCountdownPhase] = useState<"preparing" | "counting" | "go" | "done">("preparing");
  const [countdownComplete, setCountdownComplete] = useState(false);
  const countdownCompleteRef = useRef(false);
  const [pendingRoundData, setPendingRoundData] = useState<any>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Start countdown immediately on mount
  useEffect(() => {
    setCountdownPhase("preparing");
    const timer1 = setTimeout(() => {
      setCountdownPhase("counting");
      setCountdownNumber(5);
    }, 1000);
    return () => clearTimeout(timer1);
  }, []);

  // Countdown timer logic
  useEffect(() => {
    if (countdownPhase === "counting" && countdownNumber !== null && countdownNumber > 0) {
      const timer = setTimeout(() => {
        setCountdownNumber(countdownNumber - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdownPhase === "counting" && countdownNumber === 0) {
      setCountdownPhase("go");
      const goTimer = setTimeout(() => {
        setCountdownPhase("done");
        setCountdownComplete(true);
        countdownCompleteRef.current = true;
      }, 800);
      return () => clearTimeout(goTimer);
    }
  }, [countdownPhase, countdownNumber]);

  // Apply pending round data after countdown completes
  useEffect(() => {
    if (countdownComplete && pendingRoundData) {
      setGameStatus("question");
      setCurrentRound(pendingRoundData.round || 1);
      setIsLightningRound(pendingRoundData.isLightningRound || false);
      setContent(pendingRoundData.content || null);
      setTimeLeft(pendingRoundData.timeLimit || 20);
      setTotalTime(pendingRoundData.timeLimit || 20);
      setHasAnswered(false);
      setSelectedPlayers([]);
      setCorrectPlayerIds([]);
      setRoundResults([]);
      setGameMode(pendingRoundData.gameMode || "who_liked");
      setNumericAnswer("");
      setCorrectAnswer(null);
      setPendingRoundData(null);
    }
  }, [countdownComplete, pendingRoundData]);

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
    mutationFn: async (data: { selectedUserIds?: string[]; numericAnswer?: string }) => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/answer`, {
        oderId: userId,
        selectedUserIds: data.selectedUserIds || [],
        numericAnswer: data.numericAnswer,
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
            // For first round, queue data until countdown completes
            if (!countdownCompleteRef.current && (message.round === 1 || currentRound === 0)) {
              setPendingRoundData({
                round: message.round,
                isLightningRound: message.isLightningRound,
                content: message.content,
                timeLimit: message.timeLimit,
                gameMode: message.gameMode,
              });
            } else {
              // For subsequent rounds, apply immediately
              setGameStatus("question");
              setCurrentRound(message.round || 0);
              setIsLightningRound(message.isLightningRound || false);
              setContent(message.content || null);
              setTimeLeft(message.timeLimit || 20);
              setTotalTime(message.timeLimit || 20);
              setHasAnswered(false);
              setSelectedPlayers([]);
              setCorrectPlayerIds([]);
              setRoundResults([]);
              setGameMode(message.gameMode || "who_liked");
              setNumericAnswer("");
              setCorrectAnswer(null);
            }
            break;
            
          case "round_ended":
            setGameStatus("results");
            setCorrectPlayerIds(message.correctUserIds || []);
            setRoundResults(message.results || []);
            setCorrectAnswer(message.correctAnswer || null);
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

  useEffect(() => {
    if (gameQuery.data && countdownComplete) {
      const data = gameQuery.data;
      // Sync game state after countdown is complete
      if (data.gameState) {
        if (gameStatus === "waiting" && data.gameState.status === "question") {
          setGameStatus("question");
          setCurrentRound(data.gameState.currentRound || 1);
          setIsLightningRound(data.gameState.isLightningRound || false);
          setTimeLeft(data.gameState.timeLeft || 20);
          setTotalTime(data.gameState.timeLeft || 20);
          if (data.gameState.gameMode) {
            setGameMode(data.gameState.gameMode);
          }
        }
      }
      // Set content if available and not already set
      if (data.content && !content) {
        setContent(data.content);
      }
    }
  }, [gameQuery.data, gameStatus, content, countdownComplete]);

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
    const isNumeric = gameMode === "view_count" || gameMode === "subscriber_count";
    
    if (isNumeric) {
      if (!numericAnswer.trim()) {
        toast({
          title: "Tahmin gir",
          description: "Lütfen bir sayı tahmini gir.",
          variant: "destructive",
        });
        return;
      }
      answerMutation.mutate({ numericAnswer: numericAnswer.trim() });
    } else {
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
  }, [selectedPlayers, numericAnswer, gameMode, answerMutation, toast]);

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
  const isNumericMode = gameMode === "view_count" || gameMode === "subscriber_count";
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

      {gameStatus === "question" && content && (
        <>
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{ x: ["100%", "-100%"] }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute top-20 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent"
            />
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
              className="absolute bottom-32 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/15 to-transparent"
            />
          </div>

          <header className="relative flex items-center justify-between px-4 py-3 bg-gradient-to-r from-background via-background to-primary/5 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-3">
              <motion.div 
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
              >
                <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                <span className="text-xs font-semibold text-primary">Oyun</span>
              </motion.div>
              <div className="h-6 w-px bg-border/50" />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Tur</span>
                <div className="flex items-center gap-0.5">
                  <span className="text-sm font-black text-primary">{currentRound}</span>
                  <span className="text-xs text-muted-foreground">/{totalRounds}</span>
                </div>
              </div>
            </div>
            
            <Logo height={28} showAnimation={false} />
            
            <div className="flex items-center gap-2">
              {isLightningRound && (
                <motion.div 
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.5, repeat: Infinity }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-500/20 to-yellow-500/20 border border-amber-500/30"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-bold text-amber-500">2x Puan</span>
                </motion.div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50">
                <ModeIcon className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium">{modeInfo?.badge}</span>
              </div>
            </div>
          </header>

          <div className="relative px-4 py-3 bg-gradient-to-r from-muted/20 via-transparent to-muted/20 border-b border-border/30 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: totalTime, ease: "linear" }}
                    style={{ rotate: (1 - timerPercentage / 100) * 360 }}
                    className="h-12 w-12"
                  >
                    <svg className="h-12 w-12 -rotate-90" viewBox="0 0 48 48">
                      <circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        className="text-muted/30"
                      />
                      <motion.circle
                        cx="24"
                        cy="24"
                        r="20"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={125.6}
                        strokeDashoffset={125.6 * (1 - timerPercentage / 100)}
                        className={isTimeLow ? "text-red-500" : "text-primary"}
                      />
                    </svg>
                  </motion.div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <motion.span 
                      key={timeLeft}
                      initial={{ scale: 1.3, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={`text-lg font-black ${isTimeLow ? "text-red-500" : "text-foreground"}`}
                    >
                      {timeLeft}
                    </motion.span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Kalan Süre</p>
                  <p className={`text-sm font-bold ${isTimeLow ? "text-red-500" : "text-foreground"}`}>
                    {isTimeLow ? "Son Saniyeler!" : `${timeLeft} Saniye`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    animate={{ 
                      height: [4, 12 + Math.random() * 8, 4],
                      opacity: isTimeLow ? [0.5, 1, 0.5] : 1
                    }}
                    transition={{ 
                      duration: 0.4 + Math.random() * 0.2, 
                      repeat: Infinity,
                      delay: i * 0.08
                    }}
                    className={`w-1 rounded-full ${isTimeLow ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ height: 4 }}
                  />
                ))}
              </div>
            </div>

            {isTimeLow && (
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500 origin-left"
              />
            )}
          </div>

          {currentRound > 1 && (
            <div className="fixed left-4 top-24 lg:top-28 z-40 flex flex-col gap-1">
              {getSortedPlayersByScore().slice(0, 3).map((player: any, index: number) => {
                const playerId = player.userId || player.user?.id;
                const displayName = player.user?.displayName || player.displayName;
                const avatarUrl = player.user?.avatarUrl || player.avatarUrl;
                const score = playerScores.get(playerId) || player.totalScore || 0;
                const isSelf = playerId === userId;
                
                const medalColors = [
                  "from-amber-400 to-amber-600",
                  "from-slate-300 to-slate-500", 
                  "from-orange-400 to-orange-600"
                ];
                
                return (
                  <div 
                    key={playerId}
                    className={`flex items-center gap-1.5 lg:gap-2 pl-1 pr-2 lg:pr-3 py-1 rounded-full ${
                      isSelf ? "bg-primary/20 ring-1 ring-primary/40" : "bg-card/90"
                    }`}
                  >
                    <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-gradient-to-br ${medalColors[index]} flex items-center justify-center text-[10px] lg:text-xs font-black text-white shrink-0`}>
                      {index + 1}
                    </div>
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={displayName} className="w-5 h-5 lg:w-6 lg:h-6 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-muted flex items-center justify-center text-[10px] lg:text-xs font-bold shrink-0">
                        {displayName?.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] lg:text-xs font-semibold truncate max-w-[60px] lg:max-w-[80px]">{displayName}</span>
                    <span className="text-[10px] lg:text-xs font-black text-primary ml-auto">{score}</span>
                  </div>
                );
              })}
            </div>
          )}

          
          
          <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden relative">
            <div className="shrink-0 lg:shrink lg:flex-1 flex flex-col p-3 lg:p-6 relative">
              <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/30 to-transparent rounded-full hidden lg:block" />
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-2 lg:mb-4"
              >
                <div className="flex items-center gap-2 lg:gap-3 mb-1 lg:mb-3">
                  <div className="h-8 w-8 lg:h-10 lg:w-10 rounded-lg lg:rounded-xl bg-gradient-to-br from-primary to-red-600 flex items-center justify-center shadow-lg shadow-primary/25 shrink-0">
                    {content.contentType === "video" ? (
                      <Play className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    ) : (
                      <SiYoutube className="h-4 w-4 lg:h-5 lg:w-5 text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] lg:text-xs font-medium text-primary">
                        {content.contentType === "video" ? "Video" : "Kanal"}
                      </span>
                      <button 
                        onClick={openYouTubeLink}
                        className="text-[10px] lg:text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                      >
                        <ExternalLink className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
                        <span className="hidden sm:inline">YouTube'da Aç</span>
                      </button>
                    </div>
                    <h2 className="text-sm lg:text-xl font-bold leading-tight line-clamp-1 lg:line-clamp-2" data-testid="text-content-title">
                      {content.title}
                    </h2>
                  </div>
                </div>
                {content.subtitle && (
                  <p className="text-xs lg:text-sm text-muted-foreground pl-10 lg:pl-13 hidden lg:block" data-testid="text-content-subtitle">
                    {content.subtitle}
                  </p>
                )}
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-center lg:flex-1"
              >
                {content.contentType === "video" ? (
                  <div className="relative w-full max-w-[280px] lg:max-w-3xl">
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-3xl blur-xl opacity-50 hidden lg:block" />
                    <div 
                      className="relative aspect-video rounded-xl lg:rounded-2xl overflow-hidden shadow-xl lg:shadow-2xl ring-1 lg:ring-2 ring-primary/30"
                      data-testid="video-player-container"
                    >
                      <iframe
                        src={`https://www.youtube.com/embed/${content.contentId}?autoplay=1&mute=0&volume=20&controls=1&modestbranding=1&rel=0`}
                        title={content.title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ) : (
                  <button 
                    type="button"
                    className="relative w-32 h-32 lg:w-full lg:h-auto lg:max-w-md group"
                    onClick={openYouTubeLink}
                    data-testid="button-open-youtube"
                  >
                    <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-transparent to-primary/20 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity hidden lg:block" />
                    <div className="relative aspect-square rounded-xl lg:rounded-2xl overflow-hidden shadow-xl lg:shadow-2xl ring-1 lg:ring-2 ring-primary/30">
                      {content.thumbnailUrl ? (
                        <img
                          src={content.thumbnailUrl}
                          alt={content.title}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          data-testid="img-content-thumbnail"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-500/5">
                          <SiYoutube className="w-20 h-20 text-red-500" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm">
                          <Play className="h-5 w-5 text-white fill-white" />
                          <span className="text-sm font-medium text-white">YouTube'da Aç</span>
                        </div>
                      </div>
                    </div>
                  </button>
                )}
              </motion.div>
            </div>

            <div className="hidden lg:block w-px bg-gradient-to-b from-border via-border/50 to-transparent" />

            <div className="hidden lg:flex flex-col items-center py-4 px-1">
              <div className="bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 shadow-xl px-1.5 py-2 flex flex-col items-center gap-0.5">
                <Smile className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                {EMOJI_REACTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => sendReaction(emoji)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-base hover:bg-muted/60 hover:scale-110 active:scale-95 transition-all"
                    data-testid={`button-emoji-${emoji}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 lg:flex-none lg:w-80 xl:w-96 flex flex-col p-3 lg:p-4 min-h-0 overflow-hidden relative">
              <div className="absolute -left-2 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-purple-500/30 to-transparent rounded-full hidden lg:block" />
              
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                    <ModeIcon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{modeInfo?.question}</p>
                    <p className="text-xs text-muted-foreground">
                      {isNumericMode ? "Sayı Tahmini Gir" : "Bir veya Birden Fazla Oyuncu Seç"}
                    </p>
                  </div>
                </div>
              </motion.div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1">
                {isNumericMode ? (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-start py-4"
                  >
                    <div className="w-full space-y-4">
                      <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-500/10 to-violet-500/5 border border-purple-500/20">
                        <p className="text-xs text-center text-muted-foreground mb-3">
                          {gameMode === "view_count" ? "Videonun İzlenme Sayısını Tahmin Et" : "Kanalın Abone Sayısını Tahmin Et"}
                        </p>
                        
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            inputMode="numeric"
                            placeholder="Örn: 1.500.000"
                            value={numericAnswer ? parseInt(numericAnswer).toLocaleString('tr-TR') : ''}
                            onChange={(e) => setNumericAnswer(e.target.value.replace(/[^0-9]/g, ''))}
                            disabled={hasAnswered}
                            className="text-center text-lg font-bold flex-1 h-14 bg-background/50 border-purple-500/30 focus:border-purple-500"
                            data-testid="input-numeric-answer"
                          />
                          {numericAnswer && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setNumericAnswer("")}
                              disabled={hasAnswered}
                              className="shrink-0 h-14 w-14"
                            >
                              <X className="h-5 w-5" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {numericAnswer && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 text-center"
                        >
                          <p className="text-xs text-emerald-500 font-medium mb-1">Tahminin</p>
                          <p className="text-2xl font-black text-emerald-500">{parseInt(numericAnswer).toLocaleString('tr-TR')}</p>
                        </motion.div>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <>
                    <div className="hidden lg:grid grid-cols-2 gap-2">
                      {allPlayers.map((player: any, index: number) => {
                        const playerId = player.userId || player.user?.id;
                        const displayName = player.user?.displayName || player.displayName;
                        const avatarUrl = player.user?.avatarUrl;
                        const isSelected = selectedPlayers.includes(playerId);
                        const isSelf = playerId === userId;
                        
                        return (
                          <motion.button
                            key={playerId}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.03 }}
                            onClick={() => !hasAnswered && handlePlayerToggle(playerId, !isSelected)}
                            disabled={hasAnswered}
                            className={`relative flex flex-col items-center p-3 rounded-2xl transition-all text-center ${
                              hasAnswered 
                                ? "opacity-50 cursor-not-allowed" 
                                : "hover:scale-[1.02] active:scale-[0.98]"
                            } ${
                              isSelected 
                                ? "bg-gradient-to-br from-primary/20 to-primary/10 ring-2 ring-primary shadow-lg shadow-primary/20" 
                                : "bg-muted/30 hover:bg-muted/50"
                            }`}
                            data-testid={`button-player-${playerId}`}
                          >
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="absolute -top-1 -right-1 h-6 w-6 bg-primary rounded-full flex items-center justify-center shadow-lg"
                              >
                                <Check className="h-3.5 w-3.5 text-primary-foreground" />
                              </motion.div>
                            )}
                            
                            <div className="relative mb-2">
                              {avatarUrl ? (
                                <img 
                                  src={avatarUrl} 
                                  alt={displayName}
                                  className={`w-14 h-14 rounded-xl object-cover transition-all ${
                                    isSelected ? "ring-2 ring-primary" : ""
                                  }`}
                                />
                              ) : (
                                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold transition-all ${
                                  isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}>
                                  {displayName?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            
                            <p className="text-sm font-medium truncate w-full">
                              {displayName}
                            </p>
                            {isSelf && (
                              <span className="text-[10px] text-muted-foreground">(Sen)</span>
                            )}
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="lg:hidden flex flex-wrap gap-2">
                      {allPlayers.map((player: any, index: number) => {
                        const playerId = player.userId || player.user?.id;
                        const displayName = player.user?.displayName || player.displayName;
                        const isSelected = selectedPlayers.includes(playerId);
                        const isSelf = playerId === userId;
                        
                        return (
                          <motion.button
                            key={playerId}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: index * 0.02 }}
                            onClick={() => !hasAnswered && handlePlayerToggle(playerId, !isSelected)}
                            disabled={hasAnswered}
                            className={`relative flex items-center gap-2 px-3 py-2 rounded-full transition-all ${
                              hasAnswered 
                                ? "opacity-50 cursor-not-allowed" 
                                : "active:scale-95"
                            } ${
                              isSelected 
                                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
                                : "bg-muted/50 text-foreground"
                            }`}
                            data-testid={`button-player-mobile-${playerId}`}
                          >
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 shrink-0" />
                            )}
                            <span className="text-sm font-medium whitespace-nowrap">
                              {displayName}{isSelf ? " (Sen)" : ""}
                            </span>
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="mt-4 pt-4 border-t border-border/30 shrink-0"
              >
                {hasAnswered ? (
                  <div className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/30">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 10 }}
                      className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center"
                    >
                      <Check className="h-5 w-5 text-white" />
                    </motion.div>
                    <div>
                      <p className="text-sm font-bold text-emerald-500">Cevabın Gönderildi!</p>
                      <p className="text-xs text-muted-foreground">Sonuçlar Yakında Açıklanacak</p>
                    </div>
                  </div>
                ) : (
                  <Button
                    className="w-full h-12 text-sm font-bold gap-2 bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 shadow-lg shadow-primary/25"
                    onClick={handleSubmitAnswer}
                    disabled={(isNumericMode ? !numericAnswer.trim() : selectedPlayers.length === 0) || answerMutation.isPending}
                    data-testid="button-submit-answer"
                  >
                    {answerMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-5 w-5" />
                        {isNumericMode 
                          ? "Tahmini Gönder"
                          : selectedPlayers.length === 0 
                            ? "Oyuncu Seç" 
                            : `Cevabı Kilitle (${selectedPlayers.length} Seçili)`}
                      </>
                    )}
                  </Button>
                )}
              </motion.div>
            </div>
          </main>
        </>
      )}

      {gameStatus === "waiting" && (
        <div className="flex-1 flex items-center justify-center overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
          
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              animate={{ x: ["100%", "-100%"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent"
            />
            <motion.div
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 0.5 }}
              className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"
            />
            <motion.div
              animate={{ y: ["100%", "-100%"] }}
              transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
              className="absolute left-1/4 top-0 h-full w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent"
            />
            <motion.div
              animate={{ y: ["-100%", "100%"] }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear", delay: 1 }}
              className="absolute right-1/4 top-0 h-full w-px bg-gradient-to-b from-transparent via-amber-500/20 to-transparent"
            />
          </div>

          <div className="absolute top-6 left-6 flex items-center gap-3">
            <motion.div 
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20"
            >
              <div className="h-2 w-2 rounded-full bg-primary" />
              <span className="text-xs font-medium text-primary">Aktif Oyun</span>
            </motion.div>
          </div>

          <div className="absolute top-6 right-6 flex items-center gap-2">
            {[...Array(5)].map((_, i) => (
              <motion.div
                key={i}
                animate={{ 
                  height: [8, 16 + Math.random() * 16, 8],
                  opacity: [0.3, 1, 0.3]
                }}
                transition={{ 
                  duration: 0.5 + Math.random() * 0.3, 
                  repeat: Infinity,
                  delay: i * 0.1
                }}
                className="w-1 bg-emerald-500 rounded-full"
                style={{ height: 8 }}
              />
            ))}
          </div>

          <div className="absolute bottom-6 left-6 right-6">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Signal className="h-3 w-3" />
                <span>Sinyal Güçlü</span>
              </div>
              <div className="flex items-center gap-2">
                <Radio className="h-3 w-3" />
                <span>Oda Hazırlanıyor</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-center">
            <AnimatePresence mode="wait">
              {countdownPhase === "preparing" && (
                <motion.div
                  key="preparing"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.2 }}
                  className="flex flex-col items-center"
                >
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="relative h-24 w-24 mb-6"
                  >
                    <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary" />
                    <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-emerald-500" 
                      style={{ animation: "spin 2s linear infinite reverse" }} 
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Tv className="h-8 w-8 text-primary" />
                    </div>
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">Oda Hazırlanıyor</h2>
                  <p className="text-sm text-muted-foreground">Oyun Birkaç Saniye İçinde Başlayacak</p>
                </motion.div>
              )}

              {countdownPhase === "counting" && countdownNumber !== null && (
                <motion.div
                  key={`count-${countdownNumber}`}
                  initial={{ opacity: 0, scale: 2, rotateX: -90 }}
                  animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                  exit={{ opacity: 0, scale: 0.5, rotateX: 90 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className="flex flex-col items-center"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ 
                        boxShadow: [
                          "0 0 0 0 rgba(255,0,0,0)",
                          "0 0 60px 20px rgba(255,0,0,0.3)",
                          "0 0 0 0 rgba(255,0,0,0)"
                        ]
                      }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="relative"
                    >
                      <div className="h-40 w-40 rounded-3xl bg-gradient-to-br from-primary via-red-600 to-red-700 flex items-center justify-center shadow-2xl shadow-primary/50">
                        <span className="text-8xl font-black text-white" style={{ textShadow: "0 4px 20px rgba(0,0,0,0.5)" }}>
                          {countdownNumber}
                        </span>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      initial={{ scale: 1, opacity: 0.5 }}
                      animate={{ scale: 2, opacity: 0 }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute inset-0 rounded-3xl border-2 border-primary"
                    />
                  </div>

                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-lg font-semibold mt-6 text-muted-foreground"
                  >
                    {countdownNumber === 5 && "Hazır Ol!"}
                    {countdownNumber === 4 && "Konsantre Ol!"}
                    {countdownNumber === 3 && "Dikkat!"}
                    {countdownNumber === 2 && "Neredeyse Hazır..."}
                    {countdownNumber === 1 && "Başlıyor!"}
                  </motion.p>

                  <div className="flex items-center gap-1 mt-4">
                    {[5, 4, 3, 2, 1].map((num) => (
                      <motion.div
                        key={num}
                        className={`h-2 w-8 rounded-full transition-all ${
                          num > (countdownNumber || 0) 
                            ? "bg-primary" 
                            : "bg-muted"
                        }`}
                        animate={num === countdownNumber ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {countdownPhase === "go" && (
                <motion.div
                  key="go"
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ type: "spring", damping: 10, stiffness: 100 }}
                  className="flex flex-col items-center"
                >
                  <motion.div
                    animate={{ 
                      scale: [1, 1.1, 1],
                      boxShadow: [
                        "0 0 0 0 rgba(16,185,129,0)",
                        "0 0 80px 30px rgba(16,185,129,0.4)",
                        "0 0 0 0 rgba(16,185,129,0)"
                      ]
                    }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 flex items-center justify-center shadow-2xl shadow-emerald-500/50"
                  >
                    <Play className="h-20 w-20 text-white ml-2" fill="white" />
                  </motion.div>
                  <motion.h2 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-3xl font-black mt-6 text-emerald-500"
                  >
                    Başlıyoruz!
                  </motion.h2>
                  <motion.p 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 }}
                    className="text-sm text-muted-foreground mt-2"
                  >
                    Oyun Birkaç Saniye İçinde Başlayacak
                  </motion.p>
                </motion.div>
              )}

              {countdownPhase === "done" && !pendingRoundData && gameStatus === "waiting" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center"
                >
                  <div className="relative h-20 w-20 mb-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Radio className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  <p className="text-sm font-medium">Sonraki Tur Hazırlanıyor...</p>
                  <p className="text-xs text-muted-foreground mt-1">Birazdan Başlıyor</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <style>{`
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
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
                  {isNumericMode && correctAnswer !== null ? (
                    <div className="flex items-center gap-3">
                      <span className="text-3xl md:text-4xl font-black text-green-600 dark:text-green-400">
                        {Number(correctAnswer).toLocaleString('tr-TR')}
                      </span>
                      <Badge className="bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/40 text-xs py-1 px-2 gap-1.5">
                        {gameMode === "view_count" ? <><Eye className="h-3 w-3" /> izlenme</> : <><UsersRound className="h-3 w-3" /> abone</>}
                      </Badge>
                    </div>
                  ) : correctPlayerIds.length > 0 ? (
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
                    {isNumericMode ? "Tahminler" : "Oyuncu Tahminleri"}
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
                            {isNumericMode ? (
                              result.numericAnswer ? (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className={`px-2 py-1 rounded-lg text-xs font-bold ${
                                    result.tier === "efsane" || result.tier === "harika" || result.tier === "iyi"
                                      ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                      : result.tier === "yakin" || result.tier === "uzak"
                                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                                  }`}>
                                    {parseInt(result.numericAnswer).toLocaleString('tr-TR')}
                                  </span>
                                  <Badge variant="outline" className={`text-[10px] py-0 ${
                                    result.tier === "efsane" ? "border-purple-500/50 text-purple-500" :
                                    result.tier === "harika" ? "border-green-500/50 text-green-500" :
                                    result.tier === "iyi" ? "border-blue-500/50 text-blue-500" :
                                    result.tier === "yakin" ? "border-yellow-500/50 text-yellow-500" :
                                    result.tier === "uzak" ? "border-orange-500/50 text-orange-500" :
                                    "border-red-500/50 text-red-500"
                                  }`}>
                                    {result.tier === "efsane" ? "Efsane!" :
                                     result.tier === "harika" ? "Harika" :
                                     result.tier === "iyi" ? "İyi" :
                                     result.tier === "yakin" ? "Yakın" :
                                     result.tier === "uzak" ? "Uzak" :
                                     result.tier === "riskli" ? "Riskli" : "Kaçırdın"}
                                  </Badge>
                                  {result.isBestGuess && (
                                    <Badge className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-500 border-yellow-500/40 text-[10px] py-0 gap-1">
                                      <Trophy className="h-2.5 w-2.5" />
                                      En yakın
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="italic text-muted-foreground/60">Cevap vermedi</span>
                              )
                            ) : result.selectedUserIds.length > 0 ? (
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
