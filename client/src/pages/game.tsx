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
  const [nextRoundAt, setNextRoundAt] = useState<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  // CRITICAL: Immutable snapshot of results - prevents data leakage during transitions
  const [resultsSnapshot, setResultsSnapshot] = useState<ResultsSnapshot | null>(null);
  
  // Results screen timer: 5 seconds total, shows countdown last 2 seconds
  const [resultsSecondsLeft, setResultsSecondsLeft] = useState(5);
  const [pendingRoundData, setPendingRoundData] = useState<any>(null);
  const resultsIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const transitionTriggeredRef = useRef(false);
  
  // Refs to track current values for WebSocket callbacks (avoids stale closure)
  const contentRef = useRef<Content | null>(null);
  const content2Ref = useRef<Content | null>(null);
  const gameModeRef = useRef<GameMode>("who_liked");
  const isLightningRoundRef = useRef(false);
  const currentRoundRef = useRef(0);
  
  // Keep refs in sync with state
  useEffect(() => { contentRef.current = content; }, [content]);
  useEffect(() => { content2Ref.current = content2; }, [content2]);
  useEffect(() => { gameModeRef.current = gameMode; }, [gameMode]);
  useEffect(() => { isLightningRoundRef.current = isLightningRound; }, [isLightningRound]);
  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);
  
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
        
        switch (message.type) {
          case "round_started":
            // If we're in countdown phase, cache the data for later
            // The countdown effect will apply it when done
            setPendingRoundData({
              content: message.content || null,
              content2: message.content2 || null,
              round: message.round || 1,
              isLightningRound: message.isLightningRound || false,
              timeLimit: message.timeLimit || 20,
              gameMode: message.gameMode || "who_liked",
            });
            break;
            
          case "round_ended":
            // CRITICAL: Create immutable snapshot using REFS (not stale state)
            if (contentRef.current) {
              setResultsSnapshot({
                round: currentRoundRef.current,
                content: contentRef.current,
                content2: content2Ref.current,
                correctPlayerIds: message.correctUserIds || [],
                correctContentId: message.correctContentId || null,
                results: message.results || [],
                gameMode: gameModeRef.current,
                isLightningRound: isLightningRoundRef.current,
              });
            }
            
            // Reset for new results phase
            setPendingRoundData(null);
            transitionTriggeredRef.current = false;
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
            
            // Clear any existing timer
            if (resultsIntervalRef.current) {
              clearInterval(resultsIntervalRef.current);
              resultsIntervalRef.current = null;
            }
            
            // Start 5-second countdown using setInterval
            console.log("[TIMER] Starting 5-second results countdown");
            setResultsSecondsLeft(5);
            
            let countdown = 5;
            resultsIntervalRef.current = setInterval(() => {
              countdown--;
              console.log("[TIMER] Countdown:", countdown);
              setResultsSecondsLeft(countdown);
              
              if (countdown <= 0) {
                console.log("[TIMER] Countdown complete, clearing interval");
                if (resultsIntervalRef.current) {
                  clearInterval(resultsIntervalRef.current);
                  resultsIntervalRef.current = null;
                }
              }
            }, 1000);
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

  // Handle transition when countdown reaches 0
  useEffect(() => {
    // Only trigger once when countdown hits 0 in results state
    if (gameStatus !== "results") return;
    if (resultsSecondsLeft > 0) return;
    if (transitionTriggeredRef.current) return;
    
    // Mark as triggered to prevent multiple transitions
    transitionTriggeredRef.current = true;
    console.log("[TRANSITION] Countdown finished, transitioning to question, pendingData:", !!pendingRoundData);
    
    // Reset all answer-related state
    setCorrectPlayerIds([]);
    setCorrectContentId(null);
    setRoundResults([]);
    setHasAnswered(false);
    setSelectedPlayers([]);
    setSelectedContentId(null);
    setResultsSnapshot(null);
    
    // Apply pending round data if available
    if (pendingRoundData) {
      console.log("[TRANSITION] Applying pending round data:", pendingRoundData.round);
      setContent(pendingRoundData.content);
      setContent2(pendingRoundData.content2);
      setCurrentRound(pendingRoundData.round);
      setIsLightningRound(pendingRoundData.isLightningRound);
      setTimeLeft(pendingRoundData.timeLimit);
      setTotalTime(pendingRoundData.totalTime || pendingRoundData.timeLimit);
      setGameMode(pendingRoundData.gameMode);
      setPendingRoundData(null);
    }
    
    // Reset timer for next results phase
    setResultsSecondsLeft(5);
    setGameStatus("question");
  }, [gameStatus, resultsSecondsLeft, pendingRoundData]);
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (resultsIntervalRef.current) {
        clearInterval(resultsIntervalRef.current);
      }
    };
  }, []);

  // gameQuery effect: Sync state for round transitions and results
  useEffect(() => {
    if (!gameQuery.data) return;
    
    const data = gameQuery.data;
    const serverStatus = data.gameState?.status;
    const serverRound = data.gameState?.currentRound || 0;
    
    // CRITICAL: Handle transition from results to question (next round started)
    if (serverStatus === "question" && data.content) {
      // Check if this is a new round or we're in wrong state
      if (gameStatus === "results" || gameStatus === "waiting" || (gameStatus === "question" && serverRound > currentRound)) {
        console.log(`[Polling] Caching round data - Round ${serverRound}`);
        
        // Cache the round data - countdown effect will apply it
        setPendingRoundData({
          content: data.content,
          content2: data.content2 || null,
          round: serverRound,
          isLightningRound: data.gameState.isLightningRound || false,
          timeLimit: data.gameState.timeLeft || 20,
          totalTime: data.room?.roundDuration || 20,
          gameMode: data.gameState.gameMode || "who_liked",
        });
      }
      // Also sync timeLeft during question phase
      else if (gameStatus === "question" && serverRound === currentRound && data.gameState.timeLeft !== undefined) {
        setTimeLeft(data.gameState.timeLeft);
      }
    }
    
    // Handle results state from query - also sync results data from polling
    if (serverStatus === "results" && gameStatus !== "results") {
      console.log(`[Polling] Transitioning to results - Round ${serverRound}`);
      
      // CRITICAL: Create snapshot from current content before any updates
      if (content) {
        setResultsSnapshot({
          round: serverRound,
          content: content,
          content2: content2,
          correctPlayerIds: data.gameState.correctUserIds || [],
          correctContentId: data.gameState.correctContentId || null,
          results: data.gameState.results || [],
          gameMode: data.gameState.gameMode || gameMode,
          isLightningRound: data.gameState.isLightningRound || false,
        });
      }
      
      transitionTriggeredRef.current = false;
      setGameStatus("results");
      setCurrentRound(serverRound);
      // Set next round timing
      if (data.gameState.nextRoundAt) {
        setNextRoundAt(data.gameState.nextRoundAt);
        const remaining = Math.max(0, Math.ceil((data.gameState.nextRoundAt - Date.now()) / 1000));
        setResultsSecondsLeft(remaining > 0 ? remaining : 5);
      } else {
        setResultsSecondsLeft(5);
      }
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
    if (serverStatus === "results" && gameStatus === "results" && correctPlayerIds.length === 0 && data.gameState.correctUserIds?.length > 0) {
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
  }, [gameQuery.data, gameStatus, currentRound, correctPlayerIds.length]);

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

      {/* Countdown screen - shows 2...1 before next question */}
      {gameStatus === "results" && resultsSecondsLeft <= 2 && resultsSecondsLeft > 0 && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <motion.div
            key={resultsSecondsLeft}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 1.5, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="flex flex-col items-center gap-4"
          >
            <span className="text-8xl md:text-9xl font-bold text-primary">
              {resultsSecondsLeft}
            </span>
            <p className="text-sm md:text-base text-muted-foreground font-medium">
              Sonraki Soru Geliyor...
            </p>
          </motion.div>
        </div>
      )}

      {gameStatus === "question" && content && (
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
              
              {isComparisonMode && content2 ? (
                <>
                  {/* Question Card */}
                  <div className="shrink-0 px-3 py-2 md:px-4 md:py-3 rounded-lg bg-card/60 border border-border/20 backdrop-blur-sm">
                    <p className="text-xs md:text-sm font-medium text-center text-foreground/90">{modeInfo?.question}</p>
                  </div>
                  
                  {/* VS Comparison */}
                  <div className="flex-1 flex flex-col gap-2 min-h-0">
                    <div className="flex-1 flex gap-3 md:gap-4 min-h-0" style={{ maxHeight: '320px' }}>
                      {/* Video 1 */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => !hasAnswered && setSelectedContentId(content.id)}
                        disabled={hasAnswered}
                        className={`flex-1 flex flex-col rounded-lg overflow-hidden transition-all duration-200 ${
                          selectedContentId === content.id 
                            ? "ring-2 ring-primary shadow-lg shadow-primary/20" 
                            : "ring-1 ring-border/30 hover:ring-border/60"
                        } ${hasAnswered ? "opacity-50" : ""}`}
                        data-testid="button-select-video-1"
                      >
                        <div className="relative flex-1 min-h-0 bg-muted">
                          {content.thumbnailUrl && (
                            <img src={content.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          )}
                          {selectedContentId === content.id && (
                            <div className="absolute inset-0 bg-primary/50 flex items-center justify-center">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Check className="h-4 w-4 md:h-5 md:w-5 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-2 md:p-3 bg-card border-t border-border/20">
                          <p className="text-[11px] md:text-sm font-medium line-clamp-2 leading-snug text-foreground/90">{content.title}</p>
                        </div>
                      </motion.button>

                      {/* VS Badge */}
                      <div className="shrink-0 self-center">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                          <span className="text-[9px] md:text-xs font-black text-white">VS</span>
                        </div>
                      </div>

                      {/* Video 2 */}
                      <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={() => !hasAnswered && setSelectedContentId(content2.id)}
                        disabled={hasAnswered}
                        className={`flex-1 flex flex-col rounded-lg overflow-hidden transition-all duration-200 ${
                          selectedContentId === content2.id 
                            ? "ring-2 ring-primary shadow-lg shadow-primary/20" 
                            : "ring-1 ring-border/30 hover:ring-border/60"
                        } ${hasAnswered ? "opacity-50" : ""}`}
                        data-testid="button-select-video-2"
                      >
                        <div className="relative flex-1 min-h-0 bg-muted">
                          {content2.thumbnailUrl && (
                            <img src={content2.thumbnailUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
                          )}
                          {selectedContentId === content2.id && (
                            <div className="absolute inset-0 bg-primary/50 flex items-center justify-center">
                              <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white/20 flex items-center justify-center">
                                <Check className="h-4 w-4 md:h-5 md:w-5 text-white" />
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-2 md:p-3 bg-card border-t border-border/20">
                          <p className="text-[11px] md:text-sm font-medium line-clamp-2 leading-snug text-foreground/90">{content2.title}</p>
                        </div>
                      </motion.button>
                    </div>
                  </div>

                  {/* CTA Footer */}
                  <div className="shrink-0">
                    {hasAnswered ? (
                      <div className="flex items-center justify-center gap-2 py-2.5 md:py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <Check className="h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
                        <span className="text-xs md:text-sm font-semibold text-emerald-500">Cevap Gönderildi</span>
                      </div>
                    ) : (
                      <Button
                        className="w-full h-11 md:h-12 gap-2 bg-primary hover:bg-primary/90 text-sm md:text-base font-semibold"
                        onClick={handleSubmitAnswer}
                        disabled={!selectedContentId || answerMutation.isPending}
                        data-testid="button-submit-comparison"
                      >
                        {answerMutation.isPending ? <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
                        {selectedContentId ? "Cevabı Kilitle" : "Bir Video Seç"}
                      </Button>
                    )}
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </main>

          {isTimeLow && <div className="h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />}
        </div>
      )}

      {gameStatus === "results" && resultsSnapshot && resultsSecondsLeft > 2 && (
        <div className="flex-1 flex flex-col bg-gradient-to-b from-background to-background/95">
          {/* Header Strip */}
          <header className="shrink-0 px-4 py-3 md:py-4">
            <div className="max-w-[340px] md:max-w-[440px] mx-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs md:text-sm font-medium text-foreground/80">Tur {resultsSnapshot.round}/{totalRounds}</span>
                {resultsSnapshot.isLightningRound && (
                  <span className="text-[10px] md:text-xs text-amber-500 font-medium flex items-center gap-0.5">
                    <Zap className="h-2.5 w-2.5 md:h-3 md:w-3" /> 2x
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 md:px-3 md:py-1.5 rounded-full bg-muted/30 border border-border/20">
                <span className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Sonuçlar
                </span>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-4 pb-4">
            <div className="max-w-[340px] md:max-w-[440px] mx-auto space-y-3 md:space-y-4">
              
              {/* Content Card - using snapshot */}
              <button 
                type="button"
                className="w-full rounded-lg bg-card/60 border border-border/20 backdrop-blur-sm overflow-hidden text-left"
                onClick={() => {
                  if (resultsSnapshot.content?.contentType === "video" && resultsSnapshot.content?.contentId) {
                    window.open(`https://www.youtube.com/watch?v=${resultsSnapshot.content.contentId}`, "_blank");
                  } else if (resultsSnapshot.content?.contentType === "channel" && resultsSnapshot.content?.contentId) {
                    window.open(`https://www.youtube.com/channel/${resultsSnapshot.content.contentId}`, "_blank");
                  }
                }}
              >
                <div className="flex items-center gap-3 p-3">
                  <div className="w-14 h-10 rounded-md overflow-hidden shrink-0 bg-muted">
                    {resultsSnapshot.content.thumbnailUrl && (
                      <img src={resultsSnapshot.content.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold line-clamp-1 text-foreground/90">{resultsSnapshot.content.title}</p>
                    <p className="text-[10px] text-muted-foreground">{resultsSnapshot.content.subtitle}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </button>

              {/* Correct Answer Card - using snapshot */}
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 overflow-hidden">
                <div className="px-3 py-1.5 bg-emerald-500/10 border-b border-emerald-500/20">
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Doğru Cevap</span>
                </div>
                <div className="p-3">
                  {(resultsSnapshot.gameMode === "which_older" || resultsSnapshot.gameMode === "most_viewed" || resultsSnapshot.gameMode === "which_longer" || resultsSnapshot.gameMode === "which_more_subs" || resultsSnapshot.gameMode === "which_more_videos") ? (
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-9 rounded-md overflow-hidden shrink-0 bg-muted">
                        <img 
                          src={(resultsSnapshot.correctContentId === resultsSnapshot.content.id ? resultsSnapshot.content : resultsSnapshot.content2)?.thumbnailUrl || ''} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <p className="text-xs font-medium text-foreground/90 line-clamp-2">
                        {(resultsSnapshot.correctContentId === resultsSnapshot.content.id ? resultsSnapshot.content : resultsSnapshot.content2)?.title}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-wrap">
                      {resultsSnapshot.correctPlayerIds.length > 0 ? (
                        allPlayers
                          .filter((p: any) => resultsSnapshot.correctPlayerIds.includes(p.userId || p.user?.id))
                          .map((player: any) => {
                            const avatarUrl = player.user?.avatarUrl;
                            const displayName = player.user?.displayName || player.displayName;
                            return (
                              <div key={player.userId || player.user?.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/20">
                                {avatarUrl ? (
                                  <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover" />
                                ) : (
                                  <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {displayName?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{displayName}</span>
                              </div>
                            );
                          })
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Kimse beğenmemiş</span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Player Results - using snapshot */}
              <div className="space-y-2">
                <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-1">Oyuncu Skorları</span>
                <div className="space-y-1.5">
                  {[...resultsSnapshot.results].sort((a, b) => b.score - a.score).map((result, index) => {
                    const isSelf = result.oderId === userId;
                    const isTopScorer = index === 0 && result.score > 0;
                    
                    return (
                      <motion.div 
                        key={result.oderId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`flex items-center gap-3 p-2.5 rounded-lg transition-all ${
                          result.isCorrect 
                            ? "bg-emerald-500/10 border border-emerald-500/20" 
                            : result.isPartialCorrect 
                              ? "bg-amber-500/10 border border-amber-500/20"
                              : "bg-card/60 border border-border/20"
                        } ${isSelf ? "ring-1 ring-primary/50" : ""}`}
                      >
                        {/* Rank */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                          isTopScorer ? "bg-amber-500/20" : "bg-muted/50"
                        }`}>
                          {isTopScorer ? (
                            <Trophy className="h-3.5 w-3.5 text-amber-500" />
                          ) : (
                            <span className="text-[10px] font-bold text-muted-foreground">{index + 1}</span>
                          )}
                        </div>
                        
                        {/* Avatar */}
                        <div className="relative shrink-0">
                          {result.avatarUrl ? (
                            <img src={result.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">
                              {result.displayName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {result.streak >= 3 && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                              <Flame className="h-2.5 w-2.5 text-white" />
                            </div>
                          )}
                        </div>
                        
                        {/* Name & Answer */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold truncate">{result.displayName}</span>
                            {isSelf && <span className="text-[9px] text-primary font-medium">(Sen)</span>}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate mt-0.5">
                            {(resultsSnapshot.gameMode === "which_older" || resultsSnapshot.gameMode === "most_viewed" || resultsSnapshot.gameMode === "which_longer" || resultsSnapshot.gameMode === "which_more_subs" || resultsSnapshot.gameMode === "which_more_videos") ? (
                              result.selectedContentId ? (
                                <span className={result.isCorrect ? "text-emerald-500" : "text-muted-foreground"}>
                                  {result.selectedContentId === resultsSnapshot.content.id ? resultsSnapshot.content.title?.slice(0, 20) : resultsSnapshot.content2?.title?.slice(0, 20)}...
                                </span>
                              ) : <span className="italic">Cevap vermedi</span>
                            ) : (
                              result.selectedUserIds.length > 0 ? (
                                result.selectedUserIds.map((id) => getPlayerName(id)?.split(' ')[0]).join(', ')
                              ) : <span className="italic">Cevap vermedi</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Score */}
                        <div className={`text-sm font-bold shrink-0 tabular-nums ${
                          result.score > 0 ? "text-emerald-500" : result.score < 0 ? "text-red-400" : "text-muted-foreground"
                        }`}>
                          {result.score > 0 ? `+${result.score}` : result.score}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
              
              {/* Next Round Indicator */}
              <div className="flex items-center justify-center gap-2 py-4">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 animate-spin text-primary" />
                </div>
                <span className="text-xs text-muted-foreground">Sonraki tura geçiliyor...</span>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
