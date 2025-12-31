import { useParams, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Crown, Home, RotateCcw, Loader2, Play, Trophy, Medal, Star, Check, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

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
  const [showResults, setShowResults] = useState(false);

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
    if (status === "finished") hasSeenFinished.current = true;
    if (status === "waiting" && hasSeenFinished.current) {
      setLocation(`/oyun/${roomCode}/lobi`);
    }
  }, [roomStatusQuery.data?.status, roomCode, setLocation]);

  useEffect(() => {
    const timer = setTimeout(() => setShowResults(true), 1200);
    return () => clearTimeout(timer);
  }, []);

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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] });
      setLocation(`/oyun/${roomCode}/lobi`);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] });
      setLocation(`/oyun/${roomCode}/lobi`);
    },
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  if (resultsQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Sonuçlar Yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (resultsQuery.isError || !resultsQuery.data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto" />
          <h2 className="text-xl font-bold">Sonuçlar Bulunamadı</h2>
          <Button onClick={() => setLocation("/")}>Ana Sayfaya Dön</Button>
        </div>
      </div>
    );
  }

  const results = resultsQuery.data;
  const sortedPlayers = [...results.players].sort((a, b) => b.totalScore - a.totalScore);
  const [first, second, third, ...rest] = sortedPlayers;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Ambient Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-80 h-80 bg-amber-500/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-primary/8 rounded-full blur-[80px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-center p-3 border-b border-white/5">
        <Logo height={32} />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 flex flex-col p-4 max-w-md mx-auto w-full">
        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-16 h-16 rounded-full border-2 border-amber-500/20 border-t-amber-500 mx-auto mb-4"
                />
                <p className="text-sm text-muted-foreground">Sonuçlar Hesaplanıyor...</p>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col space-y-4"
            >
              {/* Title */}
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-2"
              >
                <p className="text-xs text-muted-foreground mb-1">{results.roomName} • {results.totalRounds} Tur</p>
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  Skor Tablosu
                </h1>
              </motion.div>

              {/* Podium - Compact */}
              {first && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-end justify-center gap-3 py-4"
                >
                  {/* 2nd Place */}
                  {second && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex flex-col items-center"
                    >
                      <div className="relative">
                        <div className="w-12 h-12 rounded-xl overflow-hidden ring-2 ring-gray-400/40">
                          {second.avatarUrl ? (
                            <img src={second.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white font-bold">
                              {second.displayName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gray-500 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">2</span>
                        </div>
                      </div>
                      <p className="text-xs font-medium mt-2 truncate max-w-[60px]">{second.displayName}</p>
                      <p className="text-sm font-bold text-gray-400">{second.totalScore}</p>
                    </motion.div>
                  )}

                  {/* 1st Place */}
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="flex flex-col items-center -mt-4"
                  >
                    <motion.div
                      animate={{ y: [0, -3, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="mb-1"
                    >
                      <Crown className="h-6 w-6 text-amber-400" />
                    </motion.div>
                    <div className="relative">
                      <motion.div
                        animate={{ boxShadow: ["0 0 0 0 rgba(251,191,36,0)", "0 0 20px 5px rgba(251,191,36,0.3)", "0 0 0 0 rgba(251,191,36,0)"] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-amber-400/60"
                      >
                        {first.avatarUrl ? (
                          <img src={first.avatarUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-xl font-bold">
                            {first.displayName.charAt(0)}
                          </div>
                        )}
                      </motion.div>
                    </div>
                    <p className="text-sm font-semibold mt-2 truncate max-w-[80px]">{first.displayName}</p>
                    <p className="text-xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">{first.totalScore}</p>
                  </motion.div>

                  {/* 3rd Place */}
                  {third && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="flex flex-col items-center"
                    >
                      <div className="relative">
                        <div className="w-11 h-11 rounded-xl overflow-hidden ring-2 ring-amber-600/40">
                          {third.avatarUrl ? (
                            <img src={third.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-white font-bold">
                              {third.displayName.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-600 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-white">3</span>
                        </div>
                      </div>
                      <p className="text-xs font-medium mt-2 truncate max-w-[55px]">{third.displayName}</p>
                      <p className="text-sm font-bold text-amber-600">{third.totalScore}</p>
                    </motion.div>
                  )}
                </motion.div>
              )}

              {/* Full Leaderboard - Glass Card */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex-1 p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sıralama</span>
                  <span className="text-xs text-muted-foreground">{sortedPlayers.length} Oyuncu</span>
                </div>

                <div className="space-y-2 max-h-[280px] overflow-y-auto">
                  {sortedPlayers.map((player, index) => {
                    const rank = index + 1;
                    const isSelf = player.id === userId;
                    const isTop3 = rank <= 3;
                    
                    return (
                      <motion.div
                        key={player.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.6 + index * 0.05 }}
                        className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${
                          isSelf 
                            ? "bg-primary/10 border border-primary/20" 
                            : "bg-white/[0.02] border border-transparent hover:bg-white/[0.04]"
                        }`}
                        data-testid={`scoreboard-row-${rank}`}
                      >
                        {/* Rank */}
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          rank === 1 ? "bg-gradient-to-br from-amber-400 to-orange-500" :
                          rank === 2 ? "bg-gradient-to-br from-gray-400 to-gray-500" :
                          rank === 3 ? "bg-gradient-to-br from-amber-600 to-amber-700" :
                          "bg-white/10"
                        }`}>
                          {rank === 1 ? <Trophy className="h-3.5 w-3.5 text-white" /> :
                           rank === 2 ? <Medal className="h-3.5 w-3.5 text-white" /> :
                           rank === 3 ? <Star className="h-3.5 w-3.5 text-white" /> :
                           <span className="text-xs font-bold text-muted-foreground">{rank}</span>}
                        </div>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-lg overflow-hidden shrink-0 ring-1 ring-white/10">
                          {player.avatarUrl ? (
                            <img src={player.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center text-sm font-medium">
                              {player.displayName.charAt(0)}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium truncate">{player.displayName}</p>
                            {isSelf && <Badge className="text-[9px] px-1.5 py-0 h-4">Sen</Badge>}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span className="flex items-center gap-0.5">
                              <Check className="h-2.5 w-2.5 text-emerald-500" />
                              {player.correctAnswers}
                            </span>
                            {player.partialAnswers > 0 && (
                              <span className="flex items-center gap-0.5">
                                <Zap className="h-2.5 w-2.5 text-amber-500" />
                                {player.partialAnswers}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Score */}
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-bold tabular-nums ${
                            isTop3 ? "bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent" : ""
                          }`}>
                            {player.totalScore}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>

              {/* Actions */}
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="grid grid-cols-3 gap-2 pt-2"
              >
                <Button 
                  variant="outline" 
                  className="h-11 text-xs font-medium gap-1.5 bg-white/[0.02] border-white/10" 
                  onClick={() => setLocation("/")}
                  data-testid="button-home"
                >
                  <Home className="h-4 w-4" />
                  Ana Sayfa
                </Button>
                <Button 
                  variant="outline"
                  className="h-11 text-xs font-medium gap-1.5 bg-white/[0.02] border-white/10" 
                  onClick={() => returnToLobbyMutation.mutate()}
                  disabled={returnToLobbyMutation.isPending}
                  data-testid="button-return-lobby"
                >
                  {returnToLobbyMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RotateCcw className="h-4 w-4" />
                  )}
                  Lobi
                </Button>
                {isHost ? (
                  <Button 
                    className="h-11 text-xs font-bold gap-1.5 bg-gradient-to-r from-primary to-red-600 border-0" 
                    onClick={() => rematchMutation.mutate()}
                    disabled={rematchMutation.isPending}
                    data-testid="button-rematch"
                  >
                    {rematchMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Tekrar
                  </Button>
                ) : (
                  <div className="flex items-center justify-center text-[10px] text-muted-foreground bg-white/[0.02] border border-white/10 rounded-lg">
                    Host Başlatır
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
