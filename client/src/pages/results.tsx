import { useParams, useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { Crown, Home, RotateCcw, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface FinalResults {
  roomName: string;
  totalRounds: number;
  hostUserId?: string;
  players: Array<{
    id: string;
    displayName: string;
    uniqueName: string;
    avatarUrl?: string | null;
    totalScore: number;
    correctAnswers: number;
    partialAnswers: number;
  }>;
}

interface RoomInfo {
  status: string;
  hostUserId: string;
}

export default function Results() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomCode = params.code?.toUpperCase();
  const userId = localStorage.getItem("userId");

  const hasSeenFinished = useRef(false);
  
  const roomStatusQuery = useQuery<RoomInfo>({
    queryKey: ["/api/rooms", roomCode, "info"],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}/info`);
      if (!response.ok) throw new Error("Oda bilgisi alınamadı");
      return response.json();
    },
    enabled: !!roomCode,
    refetchInterval: 2000,
  });

  useEffect(() => {
    const status = roomStatusQuery.data?.status;
    
    if (status === "finished") {
      hasSeenFinished.current = true;
    }
    
    if (status === "waiting" && hasSeenFinished.current) {
      setLocation(`/oyun/${roomCode}/lobi`);
    }
  }, [roomStatusQuery.data?.status, roomCode, setLocation]);

  const resultsQuery = useQuery<FinalResults>({
    queryKey: ["/api/rooms", roomCode, "results"],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}/results`);
      if (!response.ok) throw new Error("Sonuçlar alınamadı");
      return response.json();
    },
    enabled: !!roomCode,
  });

  const isHost = roomStatusQuery.data?.hostUserId === userId;

  const returnToLobbyMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/return-lobby`, {});
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Lobiye dönülemedi");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] });
      setLocation(`/oyun/${roomCode}/lobi`);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const rematchMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/rematch`, { userId });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Rematch başlatılamadı");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] });
      setLocation(`/oyun/${roomCode}/lobi`);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    },
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
          <Button onClick={() => setLocation("/")}>Ana Sayfaya Dön</Button>
        </Card>
      </div>
    );
  }

  const results = resultsQuery.data;
  const sortedPlayers = [...results.players].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];
  const restPlayers = sortedPlayers.slice(3);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-yellow-500/5 rounded-full blur-3xl" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-red-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 flex items-center justify-center p-4 md:p-6">
        <Logo height={48} />
      </header>

      <main className="relative z-10 flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-3xl mx-auto w-full">
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-medium">
            {results.roomName}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Oyun Bitti
          </h1>
        </div>

        {sortedPlayers.length >= 1 && (
          <div className="flex items-end justify-center gap-2 md:gap-4 pt-4 pb-2">
            {second && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
                <div className="relative mb-2">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden ring-4 ring-gray-400/30 shadow-xl">
                    {second.avatarUrl ? (
                      <img src={second.avatarUrl} alt={second.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-400 flex items-center justify-center text-white text-xl md:text-2xl font-bold">
                        {second.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-gray-700 font-bold text-sm shadow-lg">
                    2
                  </div>
                </div>
                <div className="bg-gradient-to-t from-gray-400/20 to-gray-300/10 border border-gray-400/30 rounded-t-2xl p-3 md:p-4 w-24 md:w-28 h-20 md:h-24 flex flex-col items-center justify-end">
                  <p className="font-semibold text-sm truncate max-w-full">{second.displayName}</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-400">{second.totalScore}</p>
                </div>
              </div>
            )}

            {winner && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="relative mb-2">
                  <Crown className="absolute -top-6 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-400 animate-bounce" style={{ animationDuration: '2s' }} />
                  <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl overflow-hidden ring-4 ring-yellow-400/50 shadow-2xl shadow-yellow-500/20">
                    {winner.avatarUrl ? (
                      <img src={winner.avatarUrl} alt={winner.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                        {winner.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-500 flex items-center justify-center text-yellow-900 font-bold shadow-lg">
                    1
                  </div>
                </div>
                <div className="bg-gradient-to-t from-yellow-500/20 to-yellow-400/10 border border-yellow-400/40 rounded-t-2xl p-3 md:p-4 w-28 md:w-32 h-28 md:h-32 flex flex-col items-center justify-end">
                  <p className="font-bold text-base md:text-lg truncate max-w-full">{winner.displayName}</p>
                  <p className="text-2xl md:text-3xl font-bold text-yellow-500">{winner.totalScore}</p>
                  <p className="text-xs text-muted-foreground">puan</p>
                </div>
              </div>
            )}

            {third && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
                <div className="relative mb-2">
                  <div className="w-14 h-14 md:w-18 md:h-18 rounded-2xl overflow-hidden ring-4 ring-amber-600/30 shadow-xl">
                    {third.avatarUrl ? (
                      <img src={third.avatarUrl} alt={third.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-lg md:text-xl font-bold">
                        {third.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-bold text-xs shadow-lg">
                    3
                  </div>
                </div>
                <div className="bg-gradient-to-t from-amber-600/20 to-amber-500/10 border border-amber-600/30 rounded-t-2xl p-3 md:p-4 w-22 md:w-26 h-16 md:h-20 flex flex-col items-center justify-end">
                  <p className="font-semibold text-xs md:text-sm truncate max-w-full">{third.displayName}</p>
                  <p className="text-lg md:text-xl font-bold text-amber-600">{third.totalScore}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {restPlayers.length > 0 && (
          <div className="space-y-2 mt-2">
            {restPlayers.map((player, index) => {
              const rank = index + 4;
              const isSelf = player.id === userId;
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 md:p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50 transition-all ${
                    isSelf ? "ring-2 ring-red-500/30 bg-red-500/5" : ""
                  }`}
                  data-testid={`scoreboard-row-${rank}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center">
                    <span className="text-sm font-bold text-muted-foreground">{rank}</span>
                  </div>
                  
                  <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0">
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt={player.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                        {player.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">
                      {player.displayName}
                      {isSelf && (
                        <Badge variant="secondary" className="ml-2 text-xs">Sen</Badge>
                      )}
                    </p>
                  </div>
                  
                  <div className="text-right shrink-0">
                    <p className="text-lg font-bold">{player.totalScore}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-6">
          <Button 
            variant="outline" 
            className="flex-1" 
            size="lg"
            onClick={() => setLocation("/")}
            data-testid="button-home"
          >
            <Home className="h-5 w-5 mr-2" />
            Ana Sayfa
          </Button>
          <Button 
            variant="outline"
            className="flex-1" 
            size="lg" 
            onClick={() => returnToLobbyMutation.mutate()}
            disabled={returnToLobbyMutation.isPending}
            data-testid="button-return-lobby"
          >
            {returnToLobbyMutation.isPending ? (
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
            ) : (
              <RotateCcw className="h-5 w-5 mr-2" />
            )}
            Lobiye Dön
          </Button>
          {isHost ? (
            <Button 
              className="flex-1 bg-red-500 hover:bg-red-600" 
              size="lg" 
              onClick={() => rematchMutation.mutate()}
              disabled={rematchMutation.isPending}
              data-testid="button-rematch"
            >
              {rematchMutation.isPending ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Play className="h-5 w-5 mr-2" />
              )}
              Tekrar Oyna
            </Button>
          ) : (
            <div className="flex-1 text-center text-sm text-muted-foreground p-3 rounded-xl bg-muted/30 border border-border/50">
              Host yeni oyun başlatabilir
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
