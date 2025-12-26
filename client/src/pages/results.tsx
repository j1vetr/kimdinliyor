import { useParams, useLocation } from "wouter";
import { useEffect, useRef, useState } from "react";
import { Crown, Home, RotateCcw, Loader2, Play, Trophy, Target, Flame, Star, Medal, Sparkles, Tv, Radio, Signal, Check, Zap } from "lucide-react";
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
  const [revealPhase, setRevealPhase] = useState<"intro" | "podium" | "complete">("intro");
  const [confettiActive, setConfettiActive] = useState(false);

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

  useEffect(() => {
    const timer1 = setTimeout(() => setRevealPhase("podium"), 1500);
    const timer2 = setTimeout(() => {
      setRevealPhase("complete");
      setConfettiActive(true);
    }, 3000);
    const timer3 = setTimeout(() => setConfettiActive(false), 8000);
    
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
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
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-16 w-16 rounded-full border-4 border-amber-500/20 border-t-amber-500 mx-auto"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Trophy className="h-6 w-6 text-amber-500" />
            </div>
          </div>
          <p className="text-muted-foreground mt-4">Sonuçlar Yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (resultsQuery.isError || !resultsQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md text-center space-y-4"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center mx-auto">
            <Trophy className="h-10 w-10 text-destructive" />
          </div>
          <h2 className="text-2xl font-bold">Sonuçlar Bulunamadı</h2>
          <p className="text-muted-foreground">Oyun Sonuçlarına Ulaşılamadı</p>
          <Button onClick={() => setLocation("/")}>Ana Sayfaya Dön</Button>
        </motion.div>
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
    <div className="min-h-screen bg-background flex flex-col overflow-hidden relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: ["100%", "-100%"] }}
          transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent"
        />
        <motion.div
          animate={{ x: ["-100%", "100%"] }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute top-2/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/15 to-transparent"
        />
        <motion.div
          animate={{ y: ["100%", "-100%"] }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className="absolute left-1/3 top-0 h-full w-px bg-gradient-to-b from-transparent via-amber-500/10 to-transparent"
        />
        <motion.div
          animate={{ y: ["-100%", "100%"] }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          className="absolute right-1/4 top-0 h-full w-px bg-gradient-to-b from-transparent via-emerald-500/10 to-transparent"
        />

        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      </div>

      {confettiActive && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {[...Array(50)].map((_, i) => (
            <motion.div
              key={i}
              initial={{ 
                x: Math.random() * window.innerWidth, 
                y: -20,
                rotate: 0,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                y: window.innerHeight + 20,
                rotate: Math.random() * 720 - 360,
                x: Math.random() * window.innerWidth
              }}
              transition={{ 
                duration: Math.random() * 3 + 2,
                delay: Math.random() * 2,
                ease: "linear"
              }}
              className={`absolute w-3 h-3 ${
                i % 5 === 0 ? "bg-amber-400" :
                i % 5 === 1 ? "bg-primary" :
                i % 5 === 2 ? "bg-emerald-400" :
                i % 5 === 3 ? "bg-purple-400" :
                "bg-yellow-300"
              }`}
              style={{
                clipPath: i % 2 === 0 ? "polygon(50% 0%, 100% 100%, 0% 100%)" : "none",
                borderRadius: i % 2 === 0 ? "0" : "50%"
              }}
            />
          ))}
        </div>
      )}

      <header className="relative z-10 flex items-center justify-between px-4 py-4 border-b border-border/30">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20"
          >
            <div className="h-2 w-2 rounded-full bg-amber-500" />
            <span className="text-xs font-semibold text-amber-500">Final</span>
          </motion.div>
        </motion.div>
        
        <Logo height={36} />
        
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          {[...Array(5)].map((_, i) => (
            <motion.div
              key={i}
              animate={{ 
                height: [4, 12 + Math.random() * 8, 4],
                opacity: [0.3, 1, 0.3]
              }}
              transition={{ 
                duration: 0.5 + Math.random() * 0.3, 
                repeat: Infinity,
                delay: i * 0.1
              }}
              className="w-1 bg-amber-500 rounded-full"
              style={{ height: 4 }}
            />
          ))}
        </motion.div>
      </header>

      <main className="relative z-10 flex-1 flex flex-col p-4 md:p-6 max-w-5xl mx-auto w-full overflow-y-auto">
        <AnimatePresence mode="wait">
          {revealPhase === "intro" && (
            <motion.div
              key="intro"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              className="flex-1 flex items-center justify-center"
            >
              <div className="text-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  className="relative h-24 w-24 mx-auto mb-6"
                >
                  <div className="absolute inset-0 rounded-full border-4 border-amber-500/20" />
                  <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-amber-500" />
                  <div className="absolute inset-2 rounded-full border-2 border-transparent border-b-primary" 
                    style={{ animation: "spin 2s linear infinite reverse" }} 
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Trophy className="h-10 w-10 text-amber-500" />
                  </div>
                </motion.div>
                <h2 className="text-2xl font-bold mb-2">Sonuçlar Hesaplanıyor</h2>
                <p className="text-sm text-muted-foreground">Kazanan Açıklanmak Üzere...</p>
              </div>
            </motion.div>
          )}

          {(revealPhase === "podium" || revealPhase === "complete") && (
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-6"
            >
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full bg-muted/30 border border-border/30 mb-4">
                  <Tv className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{results.roomName}</span>
                  <div className="h-4 w-px bg-border" />
                  <span className="text-sm text-muted-foreground">{results.totalRounds} Tur Tamamlandı</span>
                </div>
                
                <motion.h1 
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4, type: "spring", damping: 10 }}
                  className="text-4xl md:text-5xl font-black tracking-tight"
                >
                  <span className="bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                    Ödül Töreni
                  </span>
                </motion.h1>
              </motion.div>

              {sortedPlayers.length >= 1 && (
                <div className="relative py-8">
                  <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-amber-500/5 to-transparent rounded-t-3xl" />
                  
                  <div className="relative flex items-end justify-center gap-2 sm:gap-4 md:gap-8">
                    {second && (
                      <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6, type: "spring", damping: 12 }}
                        className="flex flex-col items-center"
                      >
                        <div className="relative mb-3">
                          <motion.div
                            animate={{ boxShadow: ["0 0 0 0 rgba(156,163,175,0)", "0 0 30px 10px rgba(156,163,175,0.2)", "0 0 0 0 rgba(156,163,175,0)"] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-2xl overflow-hidden ring-4 ring-gray-400/40"
                          >
                            {second.avatarUrl ? (
                              <img src={second.avatarUrl} alt={second.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-2xl font-bold">
                                {second.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </motion.div>
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <Medal className="h-6 w-6 text-gray-400 drop-shadow-lg" />
                          </div>
                        </div>
                        
                        <div className="relative">
                          <div className="absolute -left-1 top-0 bottom-0 w-1 bg-gradient-to-b from-gray-400 via-gray-400/50 to-transparent rounded-full" />
                          <div className="pl-3 sm:pl-4 py-3 sm:py-4 pr-4 sm:pr-6 rounded-2xl bg-gradient-to-br from-gray-500/15 to-gray-600/5 border border-gray-400/30 min-w-[85px] sm:min-w-[100px] md:min-w-[120px]">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white font-black text-sm">
                                2
                              </div>
                              <span className="text-xs text-gray-400 font-medium">İkincilik</span>
                            </div>
                            <p className="font-bold text-sm truncate max-w-[80px] md:max-w-[100px]">{second.displayName}</p>
                            <p className="text-2xl font-black text-gray-400">{second.totalScore}</p>
                            <p className="text-[10px] text-muted-foreground">Puan</p>
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {winner && (
                      <motion.div 
                        initial={{ opacity: 0, y: 80, scale: 0.8 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ delay: 0.3, type: "spring", damping: 10 }}
                        className="flex flex-col items-center -mt-8"
                      >
                        <div className="relative mb-4">
                          <motion.div
                            animate={{ 
                              boxShadow: [
                                "0 0 0 0 rgba(251,191,36,0)",
                                "0 0 60px 20px rgba(251,191,36,0.3)",
                                "0 0 0 0 rgba(251,191,36,0)"
                              ]
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-2xl overflow-hidden ring-4 ring-amber-400/60"
                          >
                            {winner.avatarUrl ? (
                              <img src={winner.avatarUrl} alt={winner.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 flex items-center justify-center text-white text-3xl font-bold">
                                {winner.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </motion.div>
                          <motion.div 
                            animate={{ y: [0, -5, 0], rotate: [-5, 5, -5] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-6 left-1/2 -translate-x-1/2"
                          >
                            <Crown className="h-10 w-10 text-amber-400 drop-shadow-lg" />
                          </motion.div>
                        </div>
                        
                        <div className="relative">
                          <div className="absolute -left-1 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 via-amber-400/50 to-transparent rounded-full" />
                          <motion.div 
                            animate={{ boxShadow: ["0 0 0 0 rgba(251,191,36,0)", "0 0 40px 10px rgba(251,191,36,0.15)", "0 0 0 0 rgba(251,191,36,0)"] }}
                            transition={{ duration: 3, repeat: Infinity }}
                            className="pl-3 sm:pl-4 py-4 sm:py-5 pr-5 sm:pr-8 rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-500/10 border border-amber-400/40 min-w-[100px] sm:min-w-[130px] md:min-w-[160px]"
                          >
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
                                <Trophy className="h-5 w-5 text-white" />
                              </div>
                              <span className="text-xs text-amber-400 font-bold">Kazanan</span>
                            </div>
                            <p className="font-black text-lg truncate max-w-[100px] md:max-w-[130px]">{winner.displayName}</p>
                            <p className="text-4xl font-black bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">{winner.totalScore}</p>
                            <p className="text-xs text-muted-foreground">Puan</p>
                          </motion.div>
                        </div>
                      </motion.div>
                    )}

                    {third && (
                      <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.9, type: "spring", damping: 12 }}
                        className="flex flex-col items-center"
                      >
                        <div className="relative mb-3">
                          <motion.div
                            animate={{ boxShadow: ["0 0 0 0 rgba(217,119,6,0)", "0 0 25px 8px rgba(217,119,6,0.2)", "0 0 0 0 rgba(217,119,6,0)"] }}
                            transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                            className="w-12 h-12 sm:w-14 sm:h-14 md:w-18 md:h-18 rounded-2xl overflow-hidden ring-4 ring-amber-600/40"
                          >
                            {third.avatarUrl ? (
                              <img src={third.avatarUrl} alt={third.displayName} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white text-xl font-bold">
                                {third.displayName.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </motion.div>
                          <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                            <Star className="h-5 w-5 text-amber-600 drop-shadow-lg" />
                          </div>
                        </div>
                        
                        <div className="relative">
                          <div className="absolute -left-1 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-600 via-amber-600/50 to-transparent rounded-full" />
                          <div className="pl-3 sm:pl-4 py-2 sm:py-3 pr-4 sm:pr-5 rounded-2xl bg-gradient-to-br from-amber-600/15 to-amber-700/5 border border-amber-600/30 min-w-[75px] sm:min-w-[90px] md:min-w-[110px]">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-white font-black text-xs">
                                3
                              </div>
                              <span className="text-[10px] text-amber-600 font-medium">Üçüncülük</span>
                            </div>
                            <p className="font-bold text-xs truncate max-w-[70px] md:max-w-[90px]">{third.displayName}</p>
                            <p className="text-xl font-black text-amber-600">{third.totalScore}</p>
                            <p className="text-[10px] text-muted-foreground">Puan</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                </div>
              )}

              {restPlayers.length > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="space-y-3"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                      <Signal className="h-4 w-4 text-white" />
                    </div>
                    <h3 className="text-sm font-bold">Diğer Oyuncular</h3>
                    <div className="flex-1 h-px bg-gradient-to-r from-border to-transparent" />
                  </div>
                  
                  <div className="grid gap-2">
                    {restPlayers.map((player, index) => {
                      const rank = index + 4;
                      const isSelf = player.id === userId;
                      
                      return (
                        <motion.div
                          key={player.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 1.3 + index * 0.1 }}
                          className={`relative flex items-center gap-4 p-4 rounded-2xl transition-all ${
                            isSelf 
                              ? "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/30" 
                              : "bg-muted/20 border border-border/30"
                          }`}
                          data-testid={`scoreboard-row-${rank}`}
                        >
                          <div className={`absolute -left-1 top-2 bottom-2 w-1 rounded-full ${
                            isSelf ? "bg-primary" : "bg-muted"
                          }`} />
                          
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
                                <Badge className="bg-primary/20 text-primary border-primary/30 text-xs">Sen</Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Check className="h-3 w-3 text-emerald-500" />
                                {player.correctAnswers} Doğru
                              </span>
                              {player.partialAnswers > 0 && (
                                <span className="flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-amber-500" />
                                  {player.partialAnswers} Kısmi
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-right shrink-0 pl-4">
                            <p className="text-2xl font-black">{player.totalScore}</p>
                            <p className="text-[10px] text-muted-foreground">Puan</p>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.5 }}
                className="flex flex-col sm:flex-row gap-3 mt-auto pt-6"
              >
                <Button 
                  variant="outline" 
                  className="flex-1 h-12 text-sm font-semibold gap-2" 
                  onClick={() => setLocation("/")}
                  data-testid="button-home"
                >
                  <Home className="h-5 w-5" />
                  Ana Sayfa
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1 h-12 text-sm font-semibold gap-2" 
                  onClick={() => returnToLobbyMutation.mutate()}
                  disabled={returnToLobbyMutation.isPending}
                  data-testid="button-return-lobby"
                >
                  {returnToLobbyMutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <RotateCcw className="h-5 w-5" />
                  )}
                  Lobiye Dön
                </Button>
                {isHost ? (
                  <Button 
                    className="flex-1 h-12 text-sm font-bold gap-2 bg-gradient-to-r from-primary to-red-600 hover:from-primary/90 hover:to-red-600/90 shadow-lg shadow-primary/25" 
                    onClick={() => rematchMutation.mutate()}
                    disabled={rematchMutation.isPending}
                    data-testid="button-rematch"
                  >
                    {rematchMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Play className="h-5 w-5 fill-current" />
                    )}
                    Tekrar Oyna
                  </Button>
                ) : (
                  <div className="flex-1 flex items-center justify-center gap-2 text-sm text-muted-foreground p-3 rounded-2xl bg-muted/20 border border-border/30">
                    <Loader2 className="h-4 w-4 animate-spin opacity-50" />
                    Yönetici Yeni Oyun Başlatabilir
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
