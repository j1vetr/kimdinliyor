import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Loader2, Users, Send, Volume2, VolumeX, Music, Check, Trophy, User, ArrowRight, Zap, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { TimerRing } from "@/components/timer-ring";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";

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
  track: {
    id: string;
    spotifyTrackId: string;
    name: string;
    artist: string;
    albumArt: string | null;
    previewUrl: string | null;
  } | null;
  players: Array<{
    id: string;
    displayName: string;
    uniqueName: string;
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
  const [isMuted, setIsMuted] = useState(false);
  const [isPlayingOnDevice, setIsPlayingOnDevice] = useState(false);
  const currentTrackIdRef = useRef<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const gameQuery = useQuery<GameState>({
    queryKey: ["/api/rooms", roomCode, "game"],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}/game?userId=${userId}`);
      if (!response.ok) throw new Error("Oyun verisi alınamadı");
      return response.json();
    },
    enabled: !!roomCode && !!userId,
    refetchInterval: 1000,
  });

  const answerMutation = useMutation({
    mutationFn: async (selectedUserIds: string[]) => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/answer`, {
        userId,
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

  const playOnDeviceMutation = useMutation({
    mutationFn: async (trackId: string) => {
      const response = await apiRequest("POST", "/api/spotify/play", {
        userId,
        trackId,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsPlayingOnDevice(true);
    },
    onError: () => {
      setIsPlayingOnDevice(false);
    },
  });

  const pauseMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/spotify/pause", {
        userId,
      });
      return response.json();
    },
  });

  useEffect(() => {
    if (gameQuery.data) {
      setTimeLeft(gameQuery.data.timeLeft);
      setTotalTime(gameQuery.data.totalTime || 20);
    }
  }, [gameQuery.data?.timeLeft, gameQuery.data?.totalTime]);

  useEffect(() => {
    if (gameQuery.data) {
      if (gameQuery.data.status === "question" && !hasAnswered) {
        setSelectedPlayers([]);
      }
      if (gameQuery.data.status === "results" || gameQuery.data.status === "waiting") {
        setHasAnswered(false);
      }
    }
  }, [gameQuery.data?.status, gameQuery.data?.currentRound]);

  useEffect(() => {
    if (gameQuery.data?.status === "finished") {
      setLocation(`/oyun/${roomCode}/results`);
    }
  }, [gameQuery.data?.status, roomCode, setLocation]);

  useEffect(() => {
    const game = gameQuery.data;
    
    if (!game || game.status === "results" || game.status === "finished" || game.status === "waiting") {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        currentTrackIdRef.current = null;
      }
      if (isPlayingOnDevice) {
        pauseMutation.mutate();
        setIsPlayingOnDevice(false);
      }
      return;
    }
    
    if (game.status === "question" && game.track) {
      if (game.track.spotifyTrackId !== currentTrackIdRef.current) {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
        
        currentTrackIdRef.current = game.track.spotifyTrackId;
        
        const isValidSpotifyId = game.track.spotifyTrackId && 
          !game.track.spotifyTrackId.startsWith("demo-") &&
          game.track.spotifyTrackId.length === 22;
        
        if (!isMuted && isValidSpotifyId) {
          playOnDeviceMutation.mutate(game.track.spotifyTrackId, {
            onError: () => {
              if (game.track?.previewUrl) {
                const audio = new Audio(game.track.previewUrl);
                audio.volume = 0.7;
                audio.play().catch(console.error);
                audioRef.current = audio;
              }
            }
          });
        } else if (game.track.previewUrl) {
          const audio = new Audio(game.track.previewUrl);
          audio.volume = isMuted ? 0 : 0.7;
          audio.play().catch(console.error);
          audioRef.current = audio;
        }
      }
    }
  }, [gameQuery.data?.status, gameQuery.data?.track?.spotifyTrackId]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : 0.7;
    }
  }, [isMuted]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

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

  const game = gameQuery.data;
  const allPlayers = game.players;
  const isShowingResults = game.status === "results";
  const answeredCount = allPlayers.filter(p => p.answered).length;
  const currentUserId = userId;

  return (
    <div className="h-screen bg-background flex flex-col">
      {game.status === "question" && game.track && (
        <>
          {game.track.albumArt && (
            <div 
              className="fixed inset-0 z-0 opacity-20 dark:opacity-10"
              style={{
                backgroundImage: `url(${game.track.albumArt})`,
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
                Tur {game.currentRound}/{game.totalRounds}
              </Badge>
              {game.isLightningRound && (
                <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 animate-pulse">
                  <Zap className="h-3 w-3 mr-1" />
                  2x Puan
                </Badge>
              )}
              {userId && game.playerStreaks[userId] >= 2 && (
                <Badge className="bg-orange-500/20 text-orange-500 border-orange-500/30">
                  <Flame className="h-3 w-3 mr-1" />
                  {game.playerStreaks[userId]} Seri
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMuted(!isMuted)}
                data-testid="button-mute"
              >
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
            </div>
          </header>

          <main className="relative z-10 flex-1 flex flex-col lg:flex-row gap-4 p-3 md:p-6 min-h-0 overflow-y-auto">
            <div className="flex flex-col items-center lg:justify-center lg:flex-1 gap-3 md:gap-4">
              <TimerRing timeLeft={timeLeft} totalTime={totalTime} size={100} className="md:hidden" />
              <TimerRing timeLeft={timeLeft} totalTime={totalTime} size={140} className="hidden md:block" />
              
              <div className="flex flex-col items-center gap-2 md:gap-3 text-center">
                <div 
                  className="w-24 h-24 md:w-48 md:h-48 lg:w-56 lg:h-56 rounded-xl overflow-hidden shadow-2xl ring-4 ring-primary/20"
                >
                  {game.track.albumArt ? (
                    <img
                      src={game.track.albumArt}
                      alt={game.track.name}
                      className="w-full h-full object-cover"
                      data-testid="img-album-art"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/30 to-primary/10">
                      <Music className="w-1/3 h-1/3 text-muted-foreground" />
                    </div>
                  )}
                </div>
                
                <div className="max-w-xs md:max-w-sm">
                  <h2 className="text-lg md:text-xl lg:text-2xl font-bold truncate" data-testid="text-track-name">
                    {game.track.name}
                  </h2>
                  <p className="text-sm md:text-base text-muted-foreground truncate" data-testid="text-artist-name">
                    {game.track.artist}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:w-[400px] xl:w-[480px] lg:min-h-0 lg:flex-1 lg:max-h-full gap-4">
              <div className="bg-card/90 backdrop-blur-md rounded-2xl border border-border shadow-lg p-4 flex flex-col lg:flex-1 lg:min-h-0 lg:max-h-full">
                <div className="text-center mb-4">
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Tahmin Et</p>
                  <h3 className="text-lg md:text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                    Bu şarkıyı kim dinliyor?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">Birden fazla oyuncu seçebilirsin</p>
                </div>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                  {allPlayers.map((player) => {
                    const isSelected = selectedPlayers.includes(player.id);
                    const isSelf = player.id === userId;
                    return (
                      <button
                        key={player.id}
                        onClick={() => !hasAnswered && handlePlayerToggle(player.id, !isSelected)}
                        disabled={hasAnswered}
                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all duration-200 text-left ${
                          hasAnswered 
                            ? "opacity-60 cursor-not-allowed" 
                            : "hover-elevate active-elevate-2 cursor-pointer"
                        } ${
                          isSelected 
                            ? "bg-primary/20 ring-2 ring-primary shadow-md" 
                            : "bg-muted/40 border border-border/50"
                        }`}
                        data-testid={`button-player-${player.id}`}
                      >
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-sm font-bold transition-all ${
                          isSelected ? "bg-primary text-primary-foreground scale-105" : "bg-muted/80"
                        }`}>
                          {isSelected ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            player.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {player.displayName}
                            {isSelf && <span className="text-muted-foreground font-normal ml-1 text-xs">(Sen)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">@{player.uniqueName}</p>
                        </div>
                        {isSelected && (
                          <div className="h-6 w-6 rounded-full bg-primary/20 flex items-center justify-center">
                            <Check className="h-3.5 w-3.5 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  {hasAnswered ? (
                    <div className="text-center p-4 rounded-xl bg-gradient-to-r from-primary/15 to-primary/5 border border-primary/30">
                      <div className="flex items-center justify-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                        <p className="text-primary font-semibold text-sm">
                          Cevabın gönderildi!
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Diğer oyuncular bekleniyor...</p>
                    </div>
                  ) : (
                    <Button
                      className="w-full h-12 text-base font-semibold"
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

              <Card className="shrink-0">
                <CardContent className="p-3">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">Tahmin Durumu</h4>
                  <div className="flex flex-wrap gap-2">
                    {allPlayers.map((player) => (
                      <div
                        key={player.id}
                        className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${
                          player.answered
                            ? "bg-green-500/20 text-green-600 dark:text-green-400"
                            : "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                        }`}
                      >
                        <div className={`w-2 h-2 rounded-full ${
                          player.answered ? "bg-green-500" : "bg-yellow-500 animate-pulse"
                        }`} />
                        {player.displayName}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </>
      )}

      {game.status === "waiting" && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center mx-auto">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
              </div>
              <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
            </div>
            <div>
              <p className="text-xl font-semibold">Sonraki tur hazırlanıyor...</p>
              <p className="text-muted-foreground">Birazdan başlıyor</p>
            </div>
          </div>
        </div>
      )}

      {isShowingResults && game.track && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <header className="flex items-center justify-between p-4 border-b border-border bg-background/80 backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <Logo height={40} />
              <span className="font-semibold">Tur Sonucu</span>
            </div>
            <Badge variant="secondary">
              Tur {game.currentRound}/{game.totalRounds}
            </Badge>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6">
            <div className="max-w-2xl mx-auto space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
                <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0">
                  {game.track.albumArt ? (
                    <img src={game.track.albumArt} alt={game.track.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <Music className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-sm truncate">{game.track.name}</h3>
                  <p className="text-xs text-muted-foreground truncate">{game.track.artist}</p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                <h3 className="text-xs font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" />
                  Doğru Cevap
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {game.players
                    .filter((p) => game.correctPlayerIds.includes(p.id))
                    .map((player) => (
                      <span key={player.id} className="text-sm font-medium text-green-700 dark:text-green-300">
                        {player.displayName}
                      </span>
                    ))}
                  {game.correctPlayerIds.length === 0 && (
                    <span className="text-sm text-muted-foreground">Kimse dinlemiyor</span>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Tahminler
                </h3>
                <div className="space-y-2">
                  {game.players.map((player) => {
                    const answer = player.lastAnswer;
                    const selectedPlayers = answer?.selectedUserIds
                      .map(id => game.players.find(p => p.id === id))
                      .filter(Boolean) || [];
                    
                    let borderColor = "border-muted";
                    let bgColor = "bg-muted/30";
                    let scoreColor = "text-muted-foreground";
                    let statusIcon = null;
                    
                    if (answer?.isCorrect) {
                      borderColor = "border-green-500/50";
                      bgColor = "bg-green-500/10";
                      scoreColor = "text-green-500";
                      statusIcon = <Check className="h-4 w-4 text-green-500" />;
                    } else if (answer?.isPartialCorrect) {
                      borderColor = "border-yellow-500/50";
                      bgColor = "bg-yellow-500/10";
                      scoreColor = "text-yellow-500";
                      statusIcon = <Zap className="h-4 w-4 text-yellow-500" />;
                    } else if (answer && !answer.isCorrect && !answer.isPartialCorrect) {
                      borderColor = "border-red-500/50";
                      bgColor = "bg-red-500/10";
                      scoreColor = "text-red-500";
                    }

                    return (
                      <div
                        key={player.id}
                        className={`rounded-xl border ${borderColor} ${bgColor} p-3 transition-all`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold">
                              {player.displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-semibold">
                                {player.displayName}
                                {player.id === currentUserId && <span className="text-muted-foreground ml-1 text-xs">(Sen)</span>}
                              </p>
                              <p className="text-xs text-muted-foreground">{player.totalScore} puan</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {statusIcon}
                            <span className={`text-lg font-bold ${scoreColor}`}>
                              {answer?.score !== undefined ? (answer.score > 0 ? `+${answer.score}` : answer.score) : "-"}
                            </span>
                          </div>
                        </div>
                        
                        {/* Selected players visualization */}
                        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border/50">
                          <span className="text-xs text-muted-foreground shrink-0">Seçti:</span>
                          {selectedPlayers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {selectedPlayers.map((p) => {
                                const isCorrectChoice = game.correctPlayerIds.includes(p!.id);
                                return (
                                  <span
                                    key={p!.id}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                      isCorrectChoice 
                                        ? "bg-green-500/20 text-green-600 dark:text-green-400" 
                                        : "bg-red-500/20 text-red-600 dark:text-red-400"
                                    }`}
                                  >
                                    {isCorrectChoice && <Check className="h-2.5 w-2.5" />}
                                    {p!.displayName}
                                  </span>
                                );
                              })}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Cevap vermedi</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="text-center py-2">
                <p className="text-muted-foreground text-sm animate-pulse">
                  Sonraki tur hazırlanıyor...
                </p>
              </div>
            </div>
          </main>
        </div>
      )}
    </div>
  );
}
