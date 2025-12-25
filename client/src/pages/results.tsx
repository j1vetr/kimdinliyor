import { useParams, useLocation } from "wouter";
import { useEffect, useRef } from "react";
import { Crown, Home, RotateCcw, Loader2, Play, Trophy, Target, Flame, Star, Medal, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Sonuçlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (resultsQuery.isError || !resultsQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <Trophy className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Sonuçlar Bulunamadı</h2>
          <p className="text-muted-foreground">
            Oyun sonuçlarına ulaşılamadı.
          </p>
          <Button onClick={() => setLocation("/")}>Ana Sayfaya Dön</Button>
        </div>
      </div>
    );
  }

  const results = resultsQuery.data;
  const sortedPlayers = [...results.players].sort((a, b) => b.totalScore - a.totalScore);
  const winner = sortedPlayers[0];
  const second = sortedPlayers[1];
  const third = sortedPlayers[2];
  const restPlayers = sortedPlayers.slice(3);

  const getRankIcon = (rank: number) => {
    if (rank === 1) return Crown;
    if (rank === 2) return Medal;
    if (rank === 3) return Star;
    return Target;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-gradient-to-br from-yellow-500/10 to-amber-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
        <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-red-500/10 to-orange-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '5s', animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-gradient-to-tr from-amber-500/8 to-yellow-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s', animationDelay: '2s' }} />
      </div>

      <header className="relative z-10 flex items-center justify-center p-4 md:p-6">
        <Logo height={48} />
      </header>

      <main className="relative z-10 flex-1 flex flex-col p-4 md:p-6 gap-6 max-w-4xl mx-auto w-full">
        <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
            <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">
              {results.roomName}
            </span>
            <Sparkles className="h-5 w-5 text-yellow-500 animate-pulse" />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">
            Oyun Bitti
          </h1>
          <p className="text-sm text-muted-foreground">
            {results.totalRounds} tur tamamlandı
          </p>
        </div>

        {sortedPlayers.length >= 1 && (
          <div className="flex items-end justify-center gap-3 md:gap-6 pt-6 pb-4">
            {second && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="relative mb-3">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Medal className="h-6 w-6 text-gray-400" />
                  </div>
                  <div className="w-18 h-18 md:w-22 md:h-22 rounded-2xl overflow-hidden ring-4 ring-gray-400/40 shadow-2xl shadow-gray-500/20">
                    {second.avatarUrl ? (
                      <img src={second.avatarUrl} alt={second.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                        {second.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center text-gray-700 font-black text-lg shadow-xl border-2 border-background">
                    2
                  </div>
                </div>
                <div className="bg-gradient-to-t from-gray-500/20 via-gray-400/10 to-transparent border border-gray-400/30 rounded-t-3xl p-4 md:p-5 w-28 md:w-32 h-24 md:h-28 flex flex-col items-center justify-end backdrop-blur-sm">
                  <p className="font-bold text-sm md:text-base truncate max-w-full">{second.displayName}</p>
                  <p className="text-2xl md:text-3xl font-black bg-gradient-to-r from-gray-400 to-gray-500 bg-clip-text text-transparent">{second.totalScore}</p>
                  <p className="text-[10px] text-muted-foreground">puan</p>
                </div>
              </div>
            )}

            {winner && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700">
                <div className="relative mb-3">
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-10">
                    <Crown className="h-10 w-10 text-yellow-400 drop-shadow-lg animate-bounce" style={{ animationDuration: '2s' }} />
                  </div>
                  <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden ring-4 ring-yellow-400/60 shadow-2xl shadow-yellow-500/30">
                    {winner.avatarUrl ? (
                      <img src={winner.avatarUrl} alt={winner.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 flex items-center justify-center text-white text-3xl md:text-4xl font-bold">
                        {winner.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full bg-gradient-to-br from-yellow-300 via-yellow-400 to-amber-500 flex items-center justify-center text-yellow-900 font-black text-xl shadow-xl border-2 border-background">
                    1
                  </div>
                </div>
                <div className="bg-gradient-to-t from-yellow-500/25 via-yellow-400/10 to-transparent border border-yellow-400/50 rounded-t-3xl p-4 md:p-6 w-32 md:w-40 h-32 md:h-40 flex flex-col items-center justify-end backdrop-blur-sm shadow-lg shadow-yellow-500/10">
                  <Badge className="bg-yellow-500/20 text-yellow-600 border-yellow-500/40 text-[10px] py-0 px-2 mb-2 gap-1">
                    <Trophy className="h-3 w-3" /> Kazanan
                  </Badge>
                  <p className="font-black text-lg md:text-xl truncate max-w-full">{winner.displayName}</p>
                  <p className="text-3xl md:text-4xl font-black bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-500 bg-clip-text text-transparent">{winner.totalScore}</p>
                  <p className="text-xs text-muted-foreground">puan</p>
                </div>
              </div>
            )}

            {third && (
              <div className="flex flex-col items-center animate-in fade-in slide-in-from-bottom-8 duration-700 delay-400">
                <div className="relative mb-3">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                    <Star className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden ring-4 ring-amber-600/40 shadow-2xl shadow-amber-600/20">
                    {third.avatarUrl ? (
                      <img src={third.avatarUrl} alt={third.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xl md:text-2xl font-bold">
                        {third.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-amber-700 flex items-center justify-center text-white font-black text-base shadow-xl border-2 border-background">
                    3
                  </div>
                </div>
                <div className="bg-gradient-to-t from-amber-600/20 via-amber-500/10 to-transparent border border-amber-600/30 rounded-t-3xl p-4 md:p-5 w-24 md:w-28 h-20 md:h-24 flex flex-col items-center justify-end backdrop-blur-sm">
                  <p className="font-bold text-xs md:text-sm truncate max-w-full">{third.displayName}</p>
                  <p className="text-xl md:text-2xl font-black bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent">{third.totalScore}</p>
                  <p className="text-[10px] text-muted-foreground">puan</p>
                </div>
              </div>
            )}
          </div>
        )}

        {restPlayers.length > 0 && (
          <div className="space-y-2 mt-2 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-500">
            {restPlayers.map((player, index) => {
              const rank = index + 4;
              const isSelf = player.id === userId;
              
              return (
                <div
                  key={player.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl bg-card/60 backdrop-blur-sm border transition-all ${
                    isSelf 
                      ? "border-red-500/40 bg-red-500/5 ring-1 ring-red-500/20" 
                      : "border-border/50 hover:border-border"
                  }`}
                  data-testid={`scoreboard-row-${rank}`}
                >
                  <div className="w-10 h-10 rounded-xl bg-muted/80 flex items-center justify-center shrink-0">
                    <span className="text-base font-black text-muted-foreground">{rank}</span>
                  </div>
                  
                  <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 ring-2 ring-border/50">
                    {player.avatarUrl ? (
                      <img src={player.avatarUrl} alt={player.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center font-bold text-lg text-muted-foreground">
                        {player.displayName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-base truncate">{player.displayName}</p>
                      {isSelf && (
                        <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-xs">Sen</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="h-3 w-3 text-green-500" />
                        {player.correctAnswers} doğru
                      </span>
                      {player.partialAnswers > 0 && (
                        <span className="flex items-center gap-1">
                          <Flame className="h-3 w-3 text-yellow-500" />
                          {player.partialAnswers} kısmi
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right shrink-0 pl-3 border-l border-border/50">
                    <p className="text-2xl font-black">{player.totalScore}</p>
                    <p className="text-[10px] text-muted-foreground">puan</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 mt-auto pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-700">
          <Button 
            variant="outline" 
            className="flex-1 h-12 text-sm font-semibold" 
            onClick={() => setLocation("/")}
            data-testid="button-home"
          >
            <Home className="h-5 w-5 mr-2" />
            Ana Sayfa
          </Button>
          <Button 
            variant="outline"
            className="flex-1 h-12 text-sm font-semibold" 
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
              className="flex-1 h-12 text-sm font-bold bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-lg shadow-red-500/20" 
              onClick={() => rematchMutation.mutate()}
              disabled={rematchMutation.isPending}
              data-testid="button-rematch"
            >
              {rematchMutation.isPending ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <Play className="h-5 w-5 mr-2 fill-current" />
              )}
              Tekrar Oyna
            </Button>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-3 rounded-2xl bg-muted/30 border border-border/50">
              <Loader2 className="h-4 w-4 mr-2 animate-spin opacity-50" />
              Host yeni oyun başlatabilir
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
