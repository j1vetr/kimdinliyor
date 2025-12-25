import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Loader2, Users, Send, Check, Zap, Flame, Play, ThumbsUp, X, ExternalLink, Eye, UsersRound, Trophy, Clock, ArrowLeft, UserPlus } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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
  const wsRef = useRef<WebSocket | null>(null);

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
            break;
            
          case "round_ended":
            setGameStatus("results");
            setCorrectPlayerIds(message.correctUserIds || []);
            setRoundResults(message.results || []);
            setCorrectAnswer(message.correctAnswer || null);
            break;
            
          case "game_finished":
            setLocation(`/oyun/${roomCode}/results`);
            break;
            
          case "player_answered":
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
    if (gameQuery.data) {
      const data = gameQuery.data;
      if (data.gameState) {
        if (gameStatus === "waiting" && data.gameState.status !== "waiting") {
          setGameStatus(data.gameState.status);
          setCurrentRound(data.gameState.currentRound || 0);
          setIsLightningRound(data.gameState.isLightningRound || false);
          setTimeLeft(data.gameState.timeLeft || 20);
        }
      }
      if (data.content && !content) {
        setContent(data.content);
      }
      if (data.room?.status === "finished") {
        setLocation(`/oyun/${roomCode}/results`);
      }
    }
  }, [gameQuery.data]);

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

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {gameStatus === "question" && content && (
        <>
          <header className="relative flex items-center justify-center px-3 py-2 bg-background border-b border-border shrink-0">
            <div className="absolute left-3 flex items-center gap-2">
              <Badge variant="outline" className="text-xs py-0.5">
                Tur {currentRound}/{totalRounds}
              </Badge>
            </div>
            <Logo height={32} showAnimation={false} />
            <div className="absolute right-3 flex items-center gap-1.5">
              {isLightningRound && (
                <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/30 text-xs py-0.5">
                  <Zap className="h-3 w-3 mr-1" />
                  2x
                </Badge>
              )}
              <Badge variant="secondary" className="text-xs py-0.5 gap-1">
                <ModeIcon className="h-3 w-3" />
                {modeInfo?.badge}
              </Badge>
            </div>
          </header>

          <div className="px-3 py-1.5 bg-muted/30 border-b border-border shrink-0">
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${
                  isTimeLow ? "bg-red-500 animate-pulse" : "bg-primary"
                }`}
                style={{ width: `${timerPercentage}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Kalan süre
              </span>
              <span className={`text-xs font-bold ${isTimeLow ? "text-red-500" : "text-foreground"}`}>
                {timeLeft} saniye
              </span>
            </div>
          </div>

          <main className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            <div className="lg:flex-1 flex flex-col p-3 lg:p-6 border-b lg:border-b-0 lg:border-r border-border overflow-y-auto">
              <div className="mb-4 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Badge variant="outline" className="text-xs py-0.5 px-2 gap-1.5">
                    {content.contentType === "video" ? (
                      <><Play className="h-3 w-3" /> Video</>
                    ) : (
                      <><SiYoutube className="h-3 w-3" /> Kanal</>
                    )}
                  </Badge>
                  <button 
                    onClick={openYouTubeLink}
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    YouTube'da aç
                  </button>
                </div>
                <h2 className="text-lg lg:text-xl font-bold leading-tight line-clamp-2 px-2" data-testid="text-content-title">
                  {content.title}
                </h2>
                {content.subtitle && (
                  <p className="text-sm text-muted-foreground mt-1" data-testid="text-content-subtitle">
                    {content.subtitle}
                  </p>
                )}
              </div>

              <div className="flex-1 flex items-center justify-center">
                {content.contentType === "video" ? (
                  <div 
                    className="w-full max-w-3xl aspect-video rounded-xl overflow-hidden shadow-2xl ring-2 ring-red-500/30"
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
                ) : (
                  <button 
                    type="button"
                    className="relative w-full max-w-sm lg:max-w-md aspect-square rounded-2xl overflow-hidden shadow-2xl ring-2 ring-red-500/30 group"
                    onClick={openYouTubeLink}
                    data-testid="button-open-youtube"
                  >
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
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                        <Play className="h-8 w-8 text-white fill-white ml-0.5" />
                      </div>
                    </div>
                  </button>
                )}
              </div>
            </div>

            <div className="lg:w-80 xl:w-96 flex flex-col p-3 lg:p-4 min-h-0 overflow-hidden">
              <div className="text-center mb-3">
                <p className="text-sm font-bold text-primary">{modeInfo?.question}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {isNumericMode ? "Sayı tahmini gir" : "Bir veya birden fazla oyuncu seçebilirsin"}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto min-h-0 space-y-1.5 pr-1">
                {isNumericMode ? (
                  <div className="flex flex-col items-center justify-center h-full py-4">
                    <div className="w-full max-w-xs space-y-3">
                      <div className="text-center">
                        <ModeIcon className="h-10 w-10 mx-auto text-primary/40 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {gameMode === "view_count" ? "Videonun izlenme sayısı" : "Kanalın abone sayısı"}
                        </p>
                      </div>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="Örnek: 1500000"
                        value={numericAnswer}
                        onChange={(e) => setNumericAnswer(e.target.value.replace(/[^0-9]/g, ''))}
                        disabled={hasAnswered}
                        className="text-center text-lg font-bold h-12"
                        data-testid="input-numeric-answer"
                      />
                      {numericAnswer && (
                        <p className="text-xs text-center text-muted-foreground">
                          Tahminin: <span className="font-semibold text-foreground">{parseInt(numericAnswer).toLocaleString('tr-TR')}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  allPlayers.map((player: any) => {
                    const playerId = player.userId || player.user?.id;
                    const displayName = player.user?.displayName || player.displayName;
                    const avatarUrl = player.user?.avatarUrl;
                    const isSelected = selectedPlayers.includes(playerId);
                    const isSelf = playerId === userId;
                    
                    return (
                      <button
                        key={playerId}
                        onClick={() => !hasAnswered && handlePlayerToggle(playerId, !isSelected)}
                        disabled={hasAnswered}
                        className={`w-full flex items-center gap-2.5 p-2.5 rounded-lg transition-all text-left ${
                          hasAnswered 
                            ? "opacity-50 cursor-not-allowed" 
                            : "hover:bg-muted/50 active:scale-[0.98]"
                        } ${
                          isSelected 
                            ? "bg-primary/10 ring-1 ring-primary" 
                            : "bg-muted/30"
                        }`}
                        data-testid={`button-player-${playerId}`}
                      >
                        <div className="relative shrink-0">
                          {avatarUrl ? (
                            <img 
                              src={avatarUrl} 
                              alt={displayName}
                              className="w-9 h-9 rounded-lg object-cover"
                            />
                          ) : (
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                            }`}>
                              {displayName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          {isSelected && (
                            <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-primary rounded-full flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-primary-foreground" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {displayName}
                            {isSelf && <span className="text-muted-foreground font-normal ml-1 text-[10px]">(Sen)</span>}
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>

              <div className="mt-3 pt-3 border-t border-border shrink-0">
                {hasAnswered ? (
                  <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-600 dark:text-green-400">Cevabın gönderildi</span>
                  </div>
                ) : (
                  <Button
                    className="w-full h-11 text-sm font-semibold"
                    onClick={handleSubmitAnswer}
                    disabled={(isNumericMode ? !numericAnswer.trim() : selectedPlayers.length === 0) || answerMutation.isPending}
                    data-testid="button-submit-answer"
                  >
                    {answerMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        {isNumericMode 
                          ? "Tahmini Gönder"
                          : selectedPlayers.length === 0 
                            ? "Oyuncu Seç" 
                            : `Gönder (${selectedPlayers.length} seçili)`}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </main>
        </>
      )}

      {gameStatus === "waiting" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">Sonraki tur hazırlanıyor...</p>
            <p className="text-xs text-muted-foreground mt-1">Birazdan başlıyor</p>
          </div>
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
                                    result.tier === "perfect" || result.tier === "excellent" || result.tier === "good"
                                      ? "bg-green-500/20 text-green-600 dark:text-green-400"
                                      : result.tier === "close" || result.tier === "far"
                                        ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                                  }`}>
                                    {parseInt(result.numericAnswer).toLocaleString('tr-TR')}
                                  </span>
                                  {result.isBestGuess && (
                                    <Badge className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-500 border-yellow-500/40 text-[10px] py-0 gap-1">
                                      <Trophy className="h-2.5 w-2.5" />
                                      En yakın tahmin
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
