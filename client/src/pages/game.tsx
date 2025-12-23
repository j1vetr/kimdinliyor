import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { Loader2, Users, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotifyIcon } from "@/components/spotify-icon";
import { PlayerCard } from "@/components/player-card";
import { TrackCard } from "@/components/track-card";
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
        description: "Cevabınız kaydedildi. Diğer oyuncular bekleniyor...",
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
    if (gameQuery.data) {
      setTimeLeft(gameQuery.data.timeLeft);
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
  const otherPlayers = game.players.filter((p) => p.id !== userId);
  const isShowingResults = game.status === "results";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <SpotifyIcon size={24} />
          <span className="font-semibold truncate max-w-[150px] md:max-w-none">
            {game.roomName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            Tur {game.currentRound}/{game.totalRounds}
          </Badge>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8 gap-6 max-w-4xl mx-auto w-full">
        {game.status === "waiting" && (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4 animate-pulse-ring">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <p className="text-xl font-medium">Sonraki tur hazırlanıyor...</p>
            </div>
          </div>
        )}

        {game.status === "question" && game.track && (
          <>
            <div className="flex justify-center">
              <TimerRing timeLeft={timeLeft} totalTime={20} size={100} />
            </div>

            <TrackCard
              trackName={game.track.name}
              artistName={game.track.artist}
              albumArtUrl={game.track.albumArt}
              size="lg"
            />

            <Card className="animate-slide-up">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-center mb-6">
                  Bu şarkıyı kim/kimler dinliyor?
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {otherPlayers.map((player) => (
                    <PlayerCard
                      key={player.id}
                      player={player}
                      isSelectable={!hasAnswered}
                      isSelected={selectedPlayers.includes(player.id)}
                      onSelect={(selected) => handlePlayerToggle(player.id, selected)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="mt-auto">
              {hasAnswered ? (
                <div className="text-center p-4 rounded-lg bg-primary/10 border border-primary/30">
                  <p className="text-primary font-medium">
                    Cevabınız gönderildi. Diğer oyuncular bekleniyor...
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
                      <Send className="h-5 w-5 mr-2" />
                      Cevapla ({selectedPlayers.length} seçili)
                    </>
                  )}
                </Button>
              )}
            </div>
          </>
        )}

        {isShowingResults && game.track && (
          <>
            <div className="text-center space-y-2 animate-fade-in">
              <h2 className="text-2xl font-bold">Tur Sonuçları</h2>
              <p className="text-muted-foreground">Tur {game.currentRound}/{game.totalRounds}</p>
            </div>

            <TrackCard
              trackName={game.track.name}
              artistName={game.track.artist}
              albumArtUrl={game.track.albumArt}
              size="md"
            />

            <Card className="animate-slide-up">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold mb-4">Doğru Cevap:</h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {game.players
                    .filter((p) => game.correctPlayerIds.includes(p.id))
                    .map((player) => (
                      <PlayerCard
                        key={player.id}
                        player={player}
                        resultType="correct"
                      />
                    ))}
                  {game.correctPlayerIds.length === 0 && (
                    <p className="text-muted-foreground col-span-2 text-center py-4">
                      Bu şarkıyı kimse dinlemiyor
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Skor Tablosu
              </h3>
              <div className="grid gap-2">
                {game.players
                  .sort((a, b) => b.totalScore - a.totalScore)
                  .map((player, index) => {
                    const answer = player.lastAnswer;
                    let resultType: "correct" | "incorrect" | "partial" | null = null;
                    if (answer) {
                      if (answer.isCorrect) resultType = "correct";
                      else if (answer.isPartialCorrect) resultType = "partial";
                      else resultType = "incorrect";
                    }
                    return (
                      <div
                        key={player.id}
                        className={`animate-slide-up stagger-${Math.min(index + 1, 5)}`}
                        style={{ animationFillMode: "backwards" }}
                      >
                        <PlayerCard
                          player={player}
                          showScore
                          resultType={resultType}
                          scoreGained={answer?.score}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="mt-auto pt-4 text-center">
              <p className="text-muted-foreground animate-pulse">
                Sonraki tur hazırlanıyor...
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
