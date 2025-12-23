import { useParams, Link } from "wouter";
import { Trophy, Medal, Home, RotateCcw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotifyIcon } from "@/components/spotify-icon";
import { useQuery } from "@tanstack/react-query";

interface FinalResults {
  roomName: string;
  totalRounds: number;
  players: Array<{
    id: string;
    displayName: string;
    uniqueName: string;
    totalScore: number;
    correctAnswers: number;
    partialAnswers: number;
  }>;
}

export default function Results() {
  const params = useParams<{ code: string }>();
  const roomCode = params.code?.toUpperCase();
  const userId = localStorage.getItem("userId");

  const resultsQuery = useQuery<FinalResults>({
    queryKey: ["/api/rooms", roomCode, "results"],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}/results`);
      if (!response.ok) throw new Error("Sonuçlar alınamadı");
      return response.json();
    },
    enabled: !!roomCode,
  });

  if (resultsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (resultsQuery.isError || !resultsQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8">
          <h2 className="text-2xl font-bold mb-4">Sonuçlar Bulunamadı</h2>
          <p className="text-muted-foreground mb-6">
            Oyun sonuçlarına ulaşılamadı.
          </p>
          <Link href="/">
            <Button>Ana Sayfaya Dön</Button>
          </Link>
        </Card>
      </div>
    );
  }

  const results = resultsQuery.data;
  const sortedPlayers = [...results.players].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sortedPlayers[0];
  const podium = sortedPlayers.slice(0, 3);
  const restPlayers = sortedPlayers.slice(3);
  const myResult = sortedPlayers.find((p) => p.id === userId);
  const myRank = sortedPlayers.findIndex((p) => p.id === userId) + 1;

  const getMedalColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "text-yellow-400";
      case 2:
        return "text-gray-300";
      case 3:
        return "text-amber-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getPodiumHeight = (rank: number) => {
    switch (rank) {
      case 1:
        return "h-32";
      case 2:
        return "h-24";
      case 3:
        return "h-16";
      default:
        return "h-12";
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <SpotifyIcon size={24} />
          <span className="font-semibold">Oyun Bitti</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8 gap-8 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-4 animate-fade-in">
          <h1 className="text-3xl md:text-4xl font-bold">{results.roomName}</h1>
          <p className="text-muted-foreground">
            {results.totalRounds} Tur Tamamlandı
          </p>
        </div>

        {winner && (
          <Card className="bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 animate-scale-in">
            <CardContent className="p-6 text-center">
              <Trophy className="h-16 w-16 text-yellow-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Kazanan</h2>
              <p className="text-3xl font-bold text-primary" data-testid="text-winner-name">
                {winner.displayName}
              </p>
              <p className="text-4xl font-bold mt-2" data-testid="text-winner-score">
                {winner.totalScore} Puan
              </p>
            </CardContent>
          </Card>
        )}

        <div className="flex items-end justify-center gap-4 h-48 animate-slide-up">
          {podium.length >= 2 && (
            <div className="flex flex-col items-center">
              <Avatar className="h-16 w-16 border-4 border-gray-300 mb-2">
                <AvatarFallback className="bg-muted font-bold">
                  {podium[1].displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium text-sm truncate max-w-[80px]">
                {podium[1].displayName}
              </p>
              <p className="font-bold">{podium[1].totalScore}</p>
              <div className={`${getPodiumHeight(2)} w-20 bg-gray-300/20 rounded-t-lg flex items-end justify-center pb-2`}>
                <Medal className={`h-8 w-8 ${getMedalColor(2)}`} />
              </div>
              <Badge variant="secondary">2.</Badge>
            </div>
          )}

          {podium.length >= 1 && (
            <div className="flex flex-col items-center">
              <Avatar className="h-20 w-20 border-4 border-yellow-400 mb-2">
                <AvatarFallback className="bg-muted font-bold text-lg">
                  {podium[0].displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium truncate max-w-[100px]">
                {podium[0].displayName}
              </p>
              <p className="font-bold text-lg">{podium[0].totalScore}</p>
              <div className={`${getPodiumHeight(1)} w-24 bg-yellow-400/20 rounded-t-lg flex items-end justify-center pb-2`}>
                <Trophy className={`h-10 w-10 ${getMedalColor(1)}`} />
              </div>
              <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/50">1.</Badge>
            </div>
          )}

          {podium.length >= 3 && (
            <div className="flex flex-col items-center">
              <Avatar className="h-14 w-14 border-4 border-amber-600 mb-2">
                <AvatarFallback className="bg-muted font-bold text-sm">
                  {podium[2].displayName.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <p className="font-medium text-sm truncate max-w-[70px]">
                {podium[2].displayName}
              </p>
              <p className="font-bold">{podium[2].totalScore}</p>
              <div className={`${getPodiumHeight(3)} w-16 bg-amber-600/20 rounded-t-lg flex items-end justify-center pb-2`}>
                <Medal className={`h-6 w-6 ${getMedalColor(3)}`} />
              </div>
              <Badge variant="secondary">3.</Badge>
            </div>
          )}
        </div>

        {restPlayers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Diğer Oyuncular</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {restPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-muted-foreground w-8">
                      {index + 4}.
                    </span>
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-muted font-medium">
                        {player.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{player.displayName}</span>
                  </div>
                  <span className="font-bold">{player.totalScore}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {myResult && (
          <Card className="border-primary/30">
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Senin Sonucun</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-3xl font-bold text-primary">{myRank}.</p>
                  <p className="text-sm text-muted-foreground">Sıralama</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{myResult.totalScore}</p>
                  <p className="text-sm text-muted-foreground">Toplam Puan</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-primary">{myResult.correctAnswers}</p>
                  <p className="text-sm text-muted-foreground">Doğru Cevap</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-auto pt-4">
          <Link href="/" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              <Home className="h-5 w-5 mr-2" />
              Ana Sayfa
            </Button>
          </Link>
          <Link href={`/oyun/${roomCode}`} className="flex-1">
            <Button className="w-full" size="lg" data-testid="button-play-again">
              <RotateCcw className="h-5 w-5 mr-2" />
              Tekrar Oyna
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
