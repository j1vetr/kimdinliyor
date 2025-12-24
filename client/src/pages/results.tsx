import { useParams, Link } from "wouter";
import { Trophy, Medal, Crown, Home, RotateCcw, Loader2, Star, Target, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const myRank = sortedPlayers.findIndex((p) => p.id === userId) + 1;

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-400" />;
      case 2:
        return <Medal className="h-5 w-5 text-gray-300" />;
      case 3:
        return <Medal className="h-5 w-5 text-amber-600" />;
      default:
        return null;
    }
  };

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return "bg-gradient-to-r from-yellow-500/20 via-yellow-400/10 to-yellow-500/20 border-yellow-400/50 ring-2 ring-yellow-400/30";
      case 2:
        return "bg-gradient-to-r from-gray-400/20 via-gray-300/10 to-gray-400/20 border-gray-300/50";
      case 3:
        return "bg-gradient-to-r from-amber-600/20 via-amber-500/10 to-amber-600/20 border-amber-600/50";
      default:
        return "bg-muted/30";
    }
  };

  const getRankBadge = (rank: number) => {
    switch (rank) {
      case 1:
        return <Badge className="bg-yellow-400 text-yellow-950 font-bold text-base px-3 py-1">1.</Badge>;
      case 2:
        return <Badge className="bg-gray-300 text-gray-800 font-bold text-base px-3 py-1">2.</Badge>;
      case 3:
        return <Badge className="bg-amber-600 text-white font-bold text-base px-3 py-1">3.</Badge>;
      default:
        return <span className="text-lg font-bold text-muted-foreground w-10 text-center">{rank}.</span>;
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

      <main className="flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-2xl mx-auto w-full">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Trophy className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl md:text-3xl font-bold">Sonuçlar</h1>
            <Trophy className="h-8 w-8 text-yellow-400" />
          </div>
          <p className="text-muted-foreground">
            {results.roomName} - {results.totalRounds} Tur
          </p>
        </div>

        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 p-4 border-b border-border">
            <h2 className="text-lg font-bold text-center flex items-center justify-center gap-2">
              <Star className="h-5 w-5 text-primary" />
              Skor Tablosu
              <Star className="h-5 w-5 text-primary" />
            </h2>
          </div>
          
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {sortedPlayers.map((player, index) => {
                const rank = index + 1;
                const isSelf = player.id === userId;
                
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-3 p-4 transition-all ${getRankStyle(rank)} ${
                      isSelf ? "ring-2 ring-primary/50" : ""
                    }`}
                    data-testid={`scoreboard-row-${rank}`}
                  >
                    <div className="flex items-center gap-2 w-16 shrink-0">
                      {getRankBadge(rank)}
                      {getRankIcon(rank)}
                    </div>
                    
                    <Avatar className={`h-12 w-12 shrink-0 ${
                      rank === 1 ? "ring-2 ring-yellow-400" : 
                      rank === 2 ? "ring-2 ring-gray-300" : 
                      rank === 3 ? "ring-2 ring-amber-600" : ""
                    }`}>
                      <AvatarFallback className={`font-bold ${
                        rank === 1 ? "bg-yellow-400/20 text-yellow-600 dark:text-yellow-400" :
                        rank === 2 ? "bg-gray-300/20" :
                        rank === 3 ? "bg-amber-600/20 text-amber-600" :
                        "bg-muted"
                      }`}>
                        {player.displayName.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold truncate ${rank === 1 ? "text-lg" : ""}`}>
                        {player.displayName}
                        {isSelf && (
                          <Badge variant="outline" className="ml-2 text-xs">Sen</Badge>
                        )}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-green-500" />
                          {player.correctAnswers} tam doğru
                        </span>
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3 text-yellow-500" />
                          {player.partialAnswers} kısmi
                        </span>
                      </div>
                    </div>
                    
                    <div className="text-right shrink-0">
                      <p className={`font-bold ${
                        rank === 1 ? "text-2xl text-yellow-500" :
                        rank === 2 ? "text-xl text-gray-400" :
                        rank === 3 ? "text-xl text-amber-600" :
                        "text-lg"
                      }`}>
                        {player.totalScore}
                      </p>
                      <p className="text-xs text-muted-foreground">puan</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {myRank > 0 && (
          <div className="text-center p-4 rounded-xl bg-primary/10 border border-primary/30">
            <p className="text-sm text-muted-foreground mb-1">Senin sıralaman</p>
            <p className="text-3xl font-bold text-primary">
              {myRank}. / {sortedPlayers.length}
            </p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-4">
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
