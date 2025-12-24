import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Loader2, Users, Send, Check, Zap, Flame, Play, ThumbsUp, X, ExternalLink } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { TimerRing } from "@/components/timer-ring";
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
}

interface RoundResult {
  oderId: string;
  displayName: string;
  avatarUrl?: string | null;
  selectedUserIds: string[];
  score: number;
  isCorrect: boolean;
  isPartialCorrect: boolean;
  totalScore: number;
  streak: number;
}

interface GameState {
  roomId: string;
  roomName: string;
  status: "waiting" | "question" | "results" | "finished";
  currentRound: number;
  totalRounds: number;
  timeLeft: number;
  totalTime: number;
  isLightningRound: boolean;
  playerStreaks: Record<string, number>;
  content: Content | null;
  players: Array<{
    id: string;
    oderId: string;
    displayName: string;
    uniqueName: string;
    avatarUrl?: string | null;
    totalScore: number;
    answered: boolean;
    lastAnswer?: {
      selectedUserIds: string[];
      isCorrect: boolean;
      isPartialCorrect: boolean;
      score: number;
    };
  }>;
  correctPlayerIds: string[];
  myAnswer?: string[];
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
  const wsRef = useRef<WebSocket | null>(null);

  const gameQuery = useQuery<any>({
    queryKey: ["/api/rooms", roomCode, "game"],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}/game`);
      if (!response.ok) throw new Error("Oyun verisi alınamadı");
      return response.json();
    },
    enabled: !!roomCode && !!userId,
    refetchInterval: 2000,
  });

  const answerMutation = useMutation({
    mutationFn: async (selectedUserIds: string[]) => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/answer`, {
        oderId: userId,
        selectedUserIds,
      });
      return response.json();
    },
    onSuccess: () => {
      setHasAnswered(true);
      toast({
        title: "Cevap gönderildi",
        description: "Diğer oyuncular bekleniyor...",
      });
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
            break;
            
          case "round_ended":
            setGameStatus("results");
            setCorrectPlayerIds(message.correctUserIds || []);
            setRoundResults(message.results || []);
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
    if (selectedPlayers.length === 0) {
      toast({
        title: "Seçim yapın",
        description: "En az bir oyuncu seçmelisiniz.",
        variant: "destructive",
      });
      return;
    }
    answerMutation.mutate(selectedPlayers);
  }, [selectedPlayers, answerMutation, toast]);

  const openYouTubeVideo = () => {
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
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Oyun yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (gameQuery.isError || !gameQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Oyun Bulunamadı</h2>
          <p className="text-muted-foreground mb-6">
            Oyun verilerine ulaşılamadı.
          </p>
          <Link href="/">
            <Button>Ana Sayfaya Dön</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const room = gameQuery.data.room;
  const allPlayers = room?.players || [];
  const totalRounds = room?.totalRounds || 10;

  const getQuestionText = () => {
    if (!content) return "Bu içeriği kim beğendi?";
    if (content.contentType === "video") {
      return "Bu videoyu kim beğendi?";
    } else {
      return "Bu kanala kim abone?";
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {gameStatus === "question" && content && (
        <>
          {content.thumbnailUrl && (
            <div 
              className="fixed inset-0 z-0 opacity-20 dark:opacity-10"
              style={{
                backgroundImage: `url(${content.thumbnailUrl})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(60px)",
              }}
            />
          )}
          
          <header className="relative z-10 flex items-center justify-between p-3 md:p-4 bg-background/80 backdrop-blur-sm border-b border-border">
            <div className="flex items-center gap-2">
              <Logo height={40} />
              <Badge variant="outline" className="font-medium">
                Tur {currentRound}/{totalRounds}
              </Badge>
              {isLightningRound && (
                <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 animate-pulse">
                  <Zap className="h-3 w-3 mr-1" />
                  2x Puan
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                {content.contentType === "video" ? (
                  <>
                    <Play className="h-3 w-3" />
                    Video
                  </>
                ) : (
                  <>
                    <SiYoutube className="h-3 w-3" />
                    Kanal
                  </>
                )}
              </Badge>
            </div>
          </header>

          <main className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 p-3 md:p-6 min-h-0 overflow-y-auto">
            <div className="flex flex-col items-center lg:justify-center lg:flex-1 gap-3 md:gap-4">
              <TimerRing timeLeft={timeLeft} totalTime={totalTime} size={100} className="md:hidden" />
              <TimerRing timeLeft={timeLeft} totalTime={totalTime} size={140} className="hidden md:block" />
              
              <div className="flex flex-col items-center gap-2 md:gap-3 text-center">
                {content.contentType === "video" ? (
                  <div 
                    className="w-48 h-28 md:w-80 md:h-48 lg:w-96 lg:h-56 rounded-xl overflow-hidden shadow-2xl ring-4 ring-red-500/20"
                    data-testid="video-player-container"
                  >
                    <iframe
                      src={`https://www.youtube.com/embed/${content.contentId}?autoplay=1&mute=1&controls=1&modestbranding=1&rel=0`}
                      title={content.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <button 
                    type="button"
                    className="relative w-32 h-24 md:w-64 md:h-48 lg:w-80 lg:h-60 rounded-xl overflow-hidden shadow-2xl ring-4 ring-red-500/20 group cursor-pointer"
                    onClick={openYouTubeVideo}
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
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/30 to-red-500/10">
                        <SiYoutube className="w-1/3 h-1/3 text-red-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                        <Play className="h-6 w-6 md:h-8 md:w-8 text-white fill-white ml-1" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Badge className="bg-black/70 text-white text-xs gap-1">
                        <ExternalLink className="h-3 w-3" />
                        YouTube'da Aç
                      </Badge>
                    </div>
                  </button>
                )}
                
                <div className="max-w-xs md:max-w-sm">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold truncate" data-testid="text-content-title">
                    {content.title}
                  </h2>
                  {content.subtitle && (
                    <p className="text-sm md:text-base text-muted-foreground truncate" data-testid="text-content-subtitle">
                      {content.subtitle}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:w-[400px] xl:w-[480px] lg:min-h-0 lg:flex-1 lg:max-h-full gap-4">
              <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-border shadow-lg p-4 flex flex-col lg:flex-1 lg:min-h-0 lg:max-h-full">
                <div className="text-center mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tahmin Et</p>
                  <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-red-500 to-red-500/60 bg-clip-text text-transparent">
                    {getQuestionText()}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Birden fazla oyuncu seçebilirsin</p>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                  {allPlayers.map((player: any) => {
                    const playerId = player.userId || player.user?.id;
                    const displayName = player.user?.displayName || player.displayName;
                    const uniqueName = player.user?.uniqueName || player.uniqueName;
                    const avatarUrl = player.user?.avatarUrl;
                    const isSelected = selectedPlayers.includes(playerId);
                    const isSelf = playerId === userId;
                    
                    return (
                      <button
                        key={playerId}
                        onClick={() => !hasAnswered && handlePlayerToggle(playerId, !isSelected)}
                        disabled={hasAnswered}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                          hasAnswered 
                            ? "opacity-60 cursor-not-allowed" 
                            : "hover-elevate active-elevate-2 cursor-pointer"
                        } ${
                          isSelected 
                            ? "bg-red-500/20 ring-2 ring-red-500 shadow-md" 
                            : "bg-muted/40 border border-border/50"
                        }`}
                        data-testid={`button-player-${playerId}`}
                      >
                        {avatarUrl ? (
                          <img 
                            src={avatarUrl} 
                            alt={displayName}
                            className={`w-11 h-11 rounded-xl object-cover transition-all ${
                              isSelected ? "ring-2 ring-red-500 scale-105" : ""
                            }`}
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                            isSelected ? "bg-red-500 text-white scale-105" : "bg-muted/80"
                          }`}>
                            {isSelected ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              displayName?.charAt(0).toUpperCase()
                            )}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {displayName}
                            {isSelf && <span className="text-muted-foreground font-normal ml-1 text-xs">(Sen)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">@{uniqueName}</p>
                        </div>
                        {isSelected && (
                          <div className="h-6 w-6 rounded-full bg-red-500/20 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-red-500" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  {hasAnswered ? (
                    <div className="text-center p-4 rounded-xl bg-gradient-to-r from-red-500/15 to-red-500/5 border border-red-500/30">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <p className="text-red-500 font-semibold text-sm">
                          Cevabın gönderildi!
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Diğer oyuncular bekleniyor...</p>
                    </div>
                  ) : (
                    <Button
                      className="w-full h-12 text-base font-semibold bg-red-500 hover:bg-red-600"
                      size="lg"
                      onClick={handleSubmitAnswer}
                      disabled={selectedPlayers.length === 0 || answerMutation.isPending}
                      data-testid="button-submit-answer"
                    >
                      {answerMutation.isPending ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin mr-2" />
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5 mr-2" />
                          {selectedPlayers.length === 0 
                            ? "Oyuncu Seç" 
                            : `Tahmin Et (${selectedPlayers.length} seçili)`}
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </main>
        </>
      )}

      {gameStatus === "waiting" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-red-500/20 flex items-center justify-center mx-auto">
                <Loader2 className="h-12 w-12 animate-spin text-red-500" />
              </div>
              <div className="absolute inset-0 rounded-full bg-red-500/10 animate-ping" />
            </div>
            <div>
              <p className="text-xl font-semibold">Sonraki tur hazırlanıyor...</p>
              <p className="text-muted-foreground">Birazdan başlıyor</p>
            </div>
          </div>
        </div>
      )}

      {gameStatus === "results" && content && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between p-3 md:p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Logo height={36} />
              <Badge variant="outline" className="font-semibold">
                Tur {currentRound}/{totalRounds} Sonucu
              </Badge>
            </div>
            {isLightningRound && (
              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                <Zap className="h-3 w-3 mr-1" />
                2x Puan
              </Badge>
            )}
          </header>

          <main className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4 md:space-y-6">
              <button 
                type="button"
                className="w-full flex flex-col sm:flex-row items-center gap-4 p-4 rounded-2xl bg-card border border-border cursor-pointer group text-left"
                onClick={openYouTubeVideo}
                data-testid="button-results-open-youtube"
              >
                <div className="relative w-24 h-18 sm:w-32 sm:h-24 rounded-xl overflow-hidden shrink-0 ring-2 ring-red-500/20">
                  {content.thumbnailUrl ? (
                    <img src={content.thumbnailUrl} alt={content.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-500/20 to-red-500/5">
                      <SiYoutube className="w-8 h-8 text-red-500" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Play className="h-8 w-8 text-white fill-white" />
                  </div>
                </div>
                <div className="flex-1 min-w-0 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                    <Badge variant="secondary" className="gap-1">
                      {content.contentType === "video" ? (
                        <>
                          <ThumbsUp className="h-3 w-3" />
                          Video
                        </>
                      ) : (
                        <>
                          <SiYoutube className="h-3 w-3" />
                          Kanal
                        </>
                      )}
                    </Badge>
                    <Badge variant="outline" className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="h-3 w-3" />
                      YouTube'da Aç
                    </Badge>
                  </div>
                  <h3 className="font-bold text-base md:text-lg truncate">{content.title}</h3>
                  <p className="text-sm text-muted-foreground truncate">{content.subtitle}</p>
                </div>
              </button>

              <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/30">
                <h3 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-3 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Check className="h-4 w-4" />
                  </div>
                  Doğru Cevap
                </h3>
                {correctPlayerIds.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {allPlayers
                      .filter((p: any) => correctPlayerIds.includes(p.userId || p.user?.id))
                      .map((player: any) => {
                        const avatarUrl = player.user?.avatarUrl || player.avatarUrl;
                        const displayName = player.user?.displayName || player.displayName;
                        return (
                          <div key={player.userId || player.user?.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500/20">
                            {avatarUrl ? (
                              <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-lg object-cover" />
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
                  <p className="text-sm text-muted-foreground">
                    {content.contentType === "video" ? "Kimse beğenmemiş" : "Kimse abone değil"}
                  </p>
                )}
              </div>

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Kim Kimi Tahmin Etti?
                </h3>
                
                <div className="grid gap-3">
                  {roundResults.map((result) => {
                    const isSelf = result.oderId === userId;
                    
                    return (
                      <div 
                        key={result.oderId} 
                        className={`p-4 rounded-2xl border transition-all ${
                          result.isCorrect 
                            ? "bg-green-500/10 border-green-500/30" 
                            : result.isPartialCorrect 
                              ? "bg-yellow-500/10 border-yellow-500/30"
                              : "bg-card border-border"
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {result.avatarUrl ? (
                              <img 
                                src={result.avatarUrl} 
                                alt={result.displayName} 
                                className="w-10 h-10 rounded-xl object-cover shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-sm font-bold shrink-0">
                                {result.displayName?.charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold truncate">
                                  {result.displayName}
                                </span>
                                {isSelf && (
                                  <Badge variant="secondary" className="text-xs">Sen</Badge>
                                )}
                                {result.streak >= 3 && (
                                  <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30 gap-1 text-xs">
                                    <Flame className="h-3 w-3" />
                                    {result.streak} Seri
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                                <span>Tahmin:</span>
                                {result.selectedUserIds.length > 0 ? (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {result.selectedUserIds.map((selectedId, idx) => {
                                      const isCorrectSelection = correctPlayerIds.includes(selectedId);
                                      const selectedName = getPlayerName(selectedId);
                                      const selectedAvatar = getPlayerAvatar(selectedId);
                                      
                                      return (
                                        <span key={selectedId} className="inline-flex items-center">
                                          {idx > 0 && <span className="mx-1">,</span>}
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                                            isCorrectSelection 
                                              ? "bg-green-500/20 text-green-700 dark:text-green-300" 
                                              : "bg-red-500/20 text-red-700 dark:text-red-300"
                                          }`}>
                                            {selectedAvatar ? (
                                              <img src={selectedAvatar} alt={selectedName} className="w-4 h-4 rounded-sm object-cover" />
                                            ) : null}
                                            {selectedName}
                                            {isCorrectSelection ? (
                                              <Check className="h-3 w-3" />
                                            ) : (
                                              <X className="h-3 w-3" />
                                            )}
                                          </span>
                                        </span>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground italic">Cevap vermedi</span>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between sm:justify-end gap-4 sm:shrink-0">
                            <div className={`text-right ${
                              result.score > 0 
                                ? "text-green-600 dark:text-green-400" 
                                : result.score < 0 
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground"
                            }`}>
                              <div className="text-lg font-bold flex items-center gap-1">
                                {result.score > 0 && "+"}
                                {result.score}
                                <span className="text-xs font-normal">puan</span>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-xs text-muted-foreground">Toplam</div>
                              <div className="font-bold text-base">{result.totalScore}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-center gap-2 py-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Sonraki tur 5 saniye içinde başlıyor...</span>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
