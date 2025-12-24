import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Loader2, Users, Send, Volume2, VolumeX, Music, Check, Trophy, User, ArrowRight } from "lucide-react";
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
    }
  }, [gameQuery.data?.timeLeft]);

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
              <TimerRing timeLeft={timeLeft} totalTime={20} size={100} className="md:hidden" />
              <TimerRing timeLeft={timeLeft} totalTime={20} size={140} className="hidden md:block" />
              
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
              <div className="bg-card/80 backdrop-blur-sm rounded-xl border border-border p-4 flex flex-col lg:flex-1 lg:min-h-0 lg:max-h-full">
                <h3 className="text-base md:text-lg font-semibold text-center mb-3 flex items-center justify-center gap-2">
                  <Users className="h-4 w-4" />
                  Bu şarkıyı kim dinliyor?
                </h3>
                
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-0">
                  {allPlayers.map((player) => {
                    const isSelected = selectedPlayers.includes(player.id);
                    const isSelf = player.id === userId;
                    return (
                      <button
                        key={player.id}
                        onClick={() => !hasAnswered && handlePlayerToggle(player.id, !isSelected)}
                        disabled={hasAnswered}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 text-left ${
                          hasAnswered 
                            ? "opacity-60 cursor-not-allowed" 
                            : "hover-elevate active-elevate-2 cursor-pointer"
                        } ${
                          isSelected 
                            ? "bg-primary/20 ring-2 ring-primary" 
                            : "bg-muted/50"
                        }`}
                        data-testid={`button-player-${player.id}`}
                      >
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
                        }`}>
                          {isSelected ? (
                            <Check className="h-5 w-5" />
                          ) : (
                            player.displayName.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {player.displayName}
                            {isSelf && <span className="text-muted-foreground ml-1">(Sen)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">@{player.uniqueName}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="mt-4 pt-4 border-t border-border">
                  {hasAnswered ? (
                    <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
                      <p className="text-primary font-medium text-sm">
                        Cevabınız gönderildi. Bekleniyor...
                      </p>
                    </div>
                  ) : (
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleSubmitAnswer}
                      disabled={selectedPlayers.length === 0 || answerMutation.isPending}
                      data-testid="button-submit-answer"
                    >
                      {answerMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Gönderiliyor...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          Cevapla ({selectedPlayers.length} seçili)
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

              <div className="space-y-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Kim Kimi Seçti
                </h3>
                <div className="space-y-1.5">
                  {game.players.map((player) => {
                    const answer = player.lastAnswer;
                    const selectedNames = answer?.selectedUserIds
                      .map(id => game.players.find(p => p.id === id)?.displayName || "?")
                      .join(", ");
                    
                    let bgColor = "bg-muted/50";
                    let scoreColor = "text-muted-foreground";
                    if (answer?.isCorrect) {
                      bgColor = "bg-green-500/10";
                      scoreColor = "text-green-600 dark:text-green-400";
                    } else if (answer?.isPartialCorrect) {
                      bgColor = "bg-yellow-500/10";
                      scoreColor = "text-yellow-600 dark:text-yellow-400";
                    } else if (answer && !answer.isCorrect && !answer.isPartialCorrect) {
                      bgColor = "bg-red-500/10";
                      scoreColor = "text-red-600 dark:text-red-400";
                    }

                    return (
                      <div
                        key={player.id}
                        className={`flex items-center gap-2 p-2 rounded-lg ${bgColor}`}
                      >
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                          {player.displayName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {player.displayName}
                            {player.id === currentUserId && <span className="text-muted-foreground ml-1">(Sen)</span>}
                          </p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <ArrowRight className="h-3 w-3" />
                            <span className="truncate">{selectedNames || "Cevap vermedi"}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className={`text-sm font-bold ${scoreColor}`}>
                            {answer?.score !== undefined ? (answer.score > 0 ? `+${answer.score}` : answer.score) : "-"}
                          </p>
                          <p className="text-xs text-muted-foreground">{player.totalScore} puan</p>
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
