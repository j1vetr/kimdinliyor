import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Crown, Loader2, Users, Play, UserX, Check, ArrowRight, User, Clock, Zap, Timer, Sparkles, Eye, Disc3, ThumbsUp, UserPlus, Heart } from "lucide-react";
import { SiYoutube, SiGoogle, SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { RoomWithPlayers } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { AuroraBackground } from "@/components/ui/animated-background";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { GradientText } from "@/components/ui/animated-text";

interface GoogleStatus {
  connected: boolean;
}

const MODE_INFO: Record<string, { label: string; icon: any; color: string }> = {
  which_older: { label: "Eski?", icon: Clock, color: "text-blue-400" },
  most_viewed: { label: "İzlenen", icon: Eye, color: "text-emerald-400" },
  which_longer: { label: "Uzun?", icon: Timer, color: "text-purple-400" },
  which_more_subs: { label: "Popüler?", icon: Users, color: "text-cyan-400" },
  which_more_videos: { label: "Emektar?", icon: Disc3, color: "text-amber-400" },
  who_liked: { label: "Beğenmiş?", icon: ThumbsUp, color: "text-red-400" },
  who_subscribed: { label: "Abone?", icon: UserPlus, color: "text-orange-400" },
  oldest_like: { label: "İlk Aşk", icon: Heart, color: "text-pink-400" },
};

export default function Lobby() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomCode = params.code?.toUpperCase();
  const [userId, setUserId] = useState<string | null>(localStorage.getItem("userId"));
  const [joinName, setJoinName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);
  const mountTimeRef = useRef(Date.now());

  const roomQuery = useQuery<RoomWithPlayers>({
    queryKey: ["/api/rooms", roomCode],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}`);
      if (!response.ok) throw new Error("Oda bulunamadı");
      return response.json();
    },
    enabled: !!roomCode,
    refetchInterval: 2000,
  });

  const startGameMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/start`);
      return response.json();
    },
    onSuccess: () => setLocation(`/oyun/${roomCode}/game`),
    onError: (error: Error) => {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    },
  });

  const kickPlayerMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/kick`, {
        requesterId: userId,
        targetUserId,
      });
      return response.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] }),
  });

  const googleStatusQuery = useQuery<GoogleStatus>({
    queryKey: ["/api/google/status", userId],
    queryFn: async () => {
      const response = await fetch(`/api/google/status?userId=${userId}`);
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 3000,
  });

  const handleQuickJoin = async () => {
    if (!joinName.trim() || !roomCode) return;
    setIsJoining(true);
    try {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/join`, {
        displayName: joinName.trim(),
      });
      const data = await response.json();
      localStorage.setItem("userId", data.userId);
      setUserId(data.userId);
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] });
    } catch (error: any) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } finally {
      setIsJoining(false);
    }
  };

  const connectGoogle = useCallback(async () => {
    try {
      const response = await fetch(`/api/google/auth-url?userId=${userId}&roomCode=${roomCode}`);
      const data = await response.json();
      if (data.authUrl) window.location.href = data.authUrl;
    } catch {
      toast({ title: "Hata", description: "Bağlantı başlatılamadı.", variant: "destructive" });
    }
  }, [userId, roomCode, toast]);

  useEffect(() => {
    const dataUpdatedAt = roomQuery.dataUpdatedAt || 0;
    if (roomQuery.data?.status === "playing" && dataUpdatedAt > mountTimeRef.current && roomQuery.fetchStatus === "idle") {
      setLocation(`/oyun/${roomCode}/game`);
    }
  }, [roomQuery.data?.status, roomQuery.dataUpdatedAt, roomQuery.fetchStatus, roomCode, setLocation]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("google_connected") === "true") {
      toast({ title: "YouTube Bağlandı" });
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/google/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] });
    }
  }, [toast, userId, roomCode]);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode!);
      setCopied(true);
      toast({ title: "Kod kopyalandı!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [roomCode, toast]);

  const shareWhatsApp = useCallback(() => {
    const url = `${window.location.origin}/oyun/${roomCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Kim Dinliyor? oyununa katıl!\n\nOda: ${roomCode}\n${url}`)}`, "_blank");
  }, [roomCode]);

  if (roomQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Lobi yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-4">
        <h2 className="text-xl font-bold">Oda Bulunamadı</h2>
        <Link href="/"><Button size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Ana Sayfa</Button></Link>
      </div>
    );
  }

  const room = roomQuery.data;
  const players = room.players || [];
  const isHost = room.hostUserId === userId;
  const playerCount = players.length;
  const maxPlayers = room.maxPlayers || 8;
  
  const guessModes = ["who_liked", "who_subscribed", "oldest_like"];
  const roomGameModes = room.gameModes || ["who_liked"];
  const hasGuessModes = roomGameModes.some(mode => guessModes.includes(mode));
  const allConnected = hasGuessModes ? players.every(p => p.user.googleConnected) : true;
  const connectedCount = players.filter(p => p.user.googleConnected).length;
  const canStart = isHost && playerCount >= 2 && allConnected;
  const isUserInRoom = userId && players.some(p => p.userId === userId);
  const isFull = playerCount >= maxPlayers;

  // Join Screen
  if (!isUserInRoom) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <AuroraBackground />

        <header className="relative z-10 flex items-center justify-between p-4">
          <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <Logo height={32} />
          <div className="w-9" />
        </header>

        <main className="relative z-10 flex items-center justify-center min-h-[calc(100vh-80px)] p-4">
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-sm"
          >
            <SpotlightCard className="p-6 rounded-3xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <div className="flex items-center justify-center gap-2 mb-4">
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full bg-emerald-500"
                />
                <span className="text-xs text-emerald-400 font-medium">Canlı Lobi</span>
              </div>

              <h1 className="text-xl font-bold text-center mb-2" data-testid="text-room-name">{room.name}</h1>
              
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{playerCount}/{maxPlayers}</span>
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{room.totalRounds} Tur</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{room.roundDuration}sn</span>
              </div>

              {/* Room Code Display */}
              <div className="flex justify-center gap-1.5 mb-6">
                {roomCode?.split('').map((char, i) => (
                  <motion.span 
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="w-9 h-11 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold"
                  >
                    {char}
                  </motion.span>
                ))}
              </div>

              {!isFull ? (
                <div className="space-y-3">
                  <Input
                    placeholder="Adını gir..."
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    maxLength={20}
                    className="h-12 bg-white/5 border-white/10 text-center text-base"
                    data-testid="input-join-name"
                    onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                  />
                  <Button 
                    onClick={handleQuickJoin} 
                    disabled={!joinName.trim() || isJoining} 
                    className="w-full h-12 gap-2 text-base font-bold bg-gradient-to-r from-primary to-red-600 border-0"
                    data-testid="button-quick-join"
                  >
                    {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
                    Lobiye Katıl
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4 text-sm text-muted-foreground bg-white/5 rounded-xl">
                  Lobi dolu
                </div>
              )}

              {players.length > 0 && (
                <div className="mt-5 pt-4 border-t border-white/5">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3 text-center">Bekleyenler</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {players.map((p, i) => (
                      <motion.span 
                        key={p.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${
                          p.user.googleConnected ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/5 text-muted-foreground border border-white/5"
                        }`}
                      >
                        {p.userId === room.hostUserId && <Crown className="h-2.5 w-2.5 text-amber-400" />}
                        {p.user.displayName}
                        {p.user.googleConnected && <Check className="h-2.5 w-2.5" />}
                      </motion.span>
                    ))}
                  </div>
                </div>
              )}
            </SpotlightCard>
          </motion.div>
        </main>
      </div>
    );
  }

  // Main Lobby
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <AuroraBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-3 border-b border-white/5">
        <Link href="/"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <Logo height={32} />
        <div className="w-9" />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-auto p-4 pb-6">
        <div className="max-w-lg mx-auto space-y-4">
          
          {/* Room Header Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <SpotlightCard className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-red-500/20 flex items-center justify-center shrink-0 ring-1 ring-white/10">
                  <SiYoutube className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h1 className="text-lg font-bold truncate" data-testid="text-room-name">{room.name}</h1>
                    {isHost && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold flex items-center gap-1 shrink-0">
                        <Crown className="h-2.5 w-2.5" />Host
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Zap className="h-3 w-3" />{room.totalRounds} Tur</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{room.roundDuration}sn</span>
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" />{playerCount}/{maxPlayers}</span>
                  </div>
                </div>
              </div>

              {/* Game Modes Chips */}
              <div className="mt-3 pt-3 border-t border-white/5 flex flex-wrap gap-1.5">
                {roomGameModes.map((mode) => {
                  const info = MODE_INFO[mode];
                  if (!info) return null;
                  const Icon = info.icon;
                  return (
                    <span key={mode} className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 border border-white/5 text-[10px] font-medium ${info.color}`}>
                      <Icon className="h-3 w-3" />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Room Code Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <SpotlightCard className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Oda Kodu</span>
                <div className="flex gap-1.5">
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={copyCode} data-testid="button-copy-code">
                    {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-400" onClick={shareWhatsApp} data-testid="button-whatsapp">
                    <SiWhatsapp className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center gap-2">
                {roomCode?.split('').map((char, i) => (
                  <motion.div 
                    key={i}
                    initial={{ opacity: 0, rotateY: 90 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    transition={{ delay: 0.1 + i * 0.05 }}
                    className="w-11 h-14 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-2xl font-black"
                  >
                    {char}
                  </motion.div>
                ))}
              </div>
            </SpotlightCard>
          </motion.div>

          {/* YouTube Connection */}
          <AnimatePresence mode="wait">
            {hasGuessModes && !googleStatusQuery.data?.connected && (
              <motion.div
                key="connect"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: 0.1 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-red-500/20"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                    <SiYoutube className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold">YouTube Bağla</p>
                    <p className="text-[11px] text-muted-foreground">Tahmin modları için gerekli</p>
                  </div>
                  <Button size="sm" onClick={connectGoogle} className="h-9 gap-1.5 bg-white/10 hover:bg-white/20 border-0" data-testid="button-connect-google">
                    <SiGoogle className="h-3.5 w-3.5" />
                    Bağlan
                  </Button>
                </div>
              </motion.div>
            )}

            {hasGuessModes && googleStatusQuery.data?.connected && (
              <motion.div
                key="connected"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400 font-medium"
              >
                <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
                  <Check className="h-4 w-4" />
                </motion.div>
                YouTube Bağlı
              </motion.div>
            )}
          </AnimatePresence>

          {/* Players Grid */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <SpotlightCard className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                  </div>
                  <span className="text-sm font-bold">Oyuncular</span>
                </div>
                {hasGuessModes && (
                  <span className={`text-xs font-bold ${connectedCount === playerCount ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {connectedCount}/{playerCount} Hazır
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {players.map((player, i) => {
                  const isReady = player.user.googleConnected || !hasGuessModes;
                  const isSelf = player.userId === userId;
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 + i * 0.03 }}
                      className={`group relative flex items-center gap-2 p-2.5 rounded-xl transition-all ${
                        isReady 
                          ? "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20" 
                          : "bg-white/[0.02] border border-white/5"
                      } ${isSelf ? "ring-1 ring-primary/30" : ""}`}
                      data-testid={`card-player-${player.userId}`}
                    >
                      <div className="relative shrink-0">
                        <div className={`w-9 h-9 rounded-lg overflow-hidden ring-2 ${isReady ? "ring-emerald-500/40" : "ring-white/10"}`}>
                          {player.user.avatarUrl ? (
                            <img src={player.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center text-sm font-bold">
                              {player.user.displayName?.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>
                        {player.userId === room.hostUserId && (
                          <motion.div
                            animate={{ rotate: [0, -5, 5, 0] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"
                          >
                            <Crown className="h-2.5 w-2.5 text-white" />
                          </motion.div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{player.user.displayName}</p>
                        <p className={`text-[10px] flex items-center gap-0.5 ${isReady ? "text-emerald-400" : "text-muted-foreground"}`}>
                          {isReady ? <><Check className="h-2.5 w-2.5" />Hazır</> : "Bekliyor..."}
                        </p>
                      </div>
                      {isHost && player.userId !== userId && (
                        <button 
                          onClick={() => kickPlayerMutation.mutate(player.userId)}
                          className="absolute top-1 right-1 w-5 h-5 rounded-md bg-red-500/10 text-red-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          data-testid={`button-kick-${player.userId}`}
                        >
                          <UserX className="h-3 w-3" />
                        </button>
                      )}
                    </motion.div>
                  );
                })}

                {/* Empty Slots */}
                {[...Array(Math.max(0, Math.min(maxPlayers, 6) - playerCount))].map((_, i) => (
                  <div key={`empty-${i}`} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.01] border border-dashed border-white/5">
                    <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                      <User className="h-4 w-4 text-muted-foreground/20" />
                    </div>
                    <span className="text-xs text-muted-foreground/30">Boş</span>
                  </div>
                ))}
              </div>
            </SpotlightCard>
          </motion.div>

          {/* Start Game Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <SpotlightCard 
              className={`p-4 rounded-2xl border transition-all ${
                canStart 
                  ? "bg-gradient-to-br from-emerald-500/10 to-green-500/5 border-emerald-500/20" 
                  : "bg-white/[0.03] border-white/10"
              }`}
            >
              <div className="flex items-center gap-3">
                <motion.div 
                  animate={canStart ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                    canStart ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-white/10"
                  }`}
                >
                  <Play className={`h-5 w-5 ${canStart ? "text-white" : "text-muted-foreground"}`} />
                </motion.div>
                <div className="flex-1">
                  <p className="text-sm font-bold">{isHost ? "Oyunu Başlat" : "Bekleniyor"}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {!canStart && playerCount < 2 && "En az 2 oyuncu gerekli"}
                    {!canStart && playerCount >= 2 && !allConnected && hasGuessModes && "Herkes YouTube bağlamalı"}
                    {canStart && "Herkes hazır!"}
                    {!isHost && playerCount >= 2 && allConnected && "Host başlatacak..."}
                  </p>
                </div>
                {isHost && (
                  <Button
                    onClick={() => startGameMutation.mutate()}
                    disabled={!canStart || startGameMutation.isPending}
                    className="h-11 px-5 gap-2 font-bold bg-gradient-to-r from-primary to-red-600 border-0 shadow-lg shadow-primary/20"
                    data-testid="button-start-game"
                  >
                    {startGameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Başlat
                  </Button>
                )}
              </div>
            </SpotlightCard>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
