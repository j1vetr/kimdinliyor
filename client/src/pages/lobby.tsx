import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Crown, Loader2, Users, Play, UserX, Check, ArrowRight, User, Clock, Zap, Link2, Timer, Sparkles, Eye, Disc3, ThumbsUp, UserPlus, Heart } from "lucide-react";
import { SiYoutube, SiGoogle, SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { RoomWithPlayers } from "@shared/schema";
import { motion, AnimatePresence } from "framer-motion";
import { DecryptedText } from "@/components/ui/decrypted-text";
import { Hyperspeed } from "@/components/ui/hyperspeed";
import { PulsingBorder } from "@/components/ui/electric-border";
import { ClickSpark } from "@/components/ui/click-spark";
import { SpotlightCard } from "@/components/ui/spotlight";

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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
        {/* Ambient */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/10 rounded-full blur-[100px]" />
          <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-[80px]" />
        </div>

        <header className="relative z-10 flex items-center justify-between p-4 border-b border-white/5">
          <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
          <Logo height={32} />
          <div className="w-9" />
        </header>

        <main className="relative z-10 flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 space-y-5"
          >
            <div className="flex items-center justify-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs text-emerald-400 font-medium">Aktif Lobi</span>
            </div>

            <div className="text-center">
              <h1 className="text-xl font-bold mb-2" data-testid="text-room-name">{room.name}</h1>
              <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{playerCount}/{maxPlayers}</span>
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{room.totalRounds} Tur</span>
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{room.roundDuration}sn</span>
              </div>
            </div>

            <div className="flex justify-center">
              <div className="flex gap-1">
                {roomCode?.split('').map((char, i) => (
                  <span key={i} className="w-8 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-lg font-bold">
                    {char}
                  </span>
                ))}
              </div>
            </div>

            {!isFull ? (
              <div className="space-y-3">
                <Input
                  placeholder="Adını gir..."
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={20}
                  className="h-11 bg-white/5 border-white/10 text-center"
                  data-testid="input-join-name"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                />
                <Button 
                  onClick={handleQuickJoin} 
                  disabled={!joinName.trim() || isJoining} 
                  className="w-full h-11 gap-2"
                  data-testid="button-quick-join"
                >
                  {isJoining ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                  Lobiye Katıl
                </Button>
              </div>
            ) : (
              <div className="text-center py-3 text-sm text-muted-foreground bg-white/5 rounded-xl">
                Lobi dolu
              </div>
            )}

            {players.length > 0 && (
              <div className="pt-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2 text-center">Bekleyenler</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {players.map((p) => (
                    <span 
                      key={p.id} 
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                        p.user.googleConnected ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-muted-foreground"
                      }`}
                    >
                      {p.userId === room.hostUserId && <Crown className="h-2.5 w-2.5" />}
                      {p.user.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  // Main Lobby
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      {/* Hyperspeed Background - behind everything */}
      <div className="fixed inset-0 pointer-events-none opacity-20 -z-10">
        <Hyperspeed starCount={80} speed={0.2} starColor="#ffffff" trailLength={0.2} />
      </div>
      {/* Ambient Overlay */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-80 h-80 bg-primary/8 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-purple-500/8 rounded-full blur-[90px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-3 border-b border-white/5">
        <Link href="/"><Button variant="ghost" size="icon" data-testid="button-back"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <Logo height={32} />
        <div className="w-9" />
      </header>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-auto p-4 pb-6">
        <div className="max-w-lg mx-auto space-y-4">
          
          {/* Room Info Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10"
          >
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-red-500/20 flex items-center justify-center shrink-0">
                <SiYoutube className="h-6 w-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-lg font-bold truncate" data-testid="text-room-name">{room.name}</h1>
                  {isHost && (
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-medium flex items-center gap-1">
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

            {/* Game Modes */}
            <div className="mt-3 pt-3 border-t border-white/5">
              <div className="flex flex-wrap gap-1.5">
                {roomGameModes.map((mode) => {
                  const info = MODE_INFO[mode];
                  if (!info) return null;
                  const Icon = info.icon;
                  return (
                    <span key={mode} className={`inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white/5 text-[10px] font-medium ${info.color}`}>
                      <Icon className="h-3 w-3" />
                      {info.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Room Code & Share with DecryptedText */}
          <SpotlightCard
            className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10"
            spotlightColor="rgba(220, 38, 38, 0.1)"
          >
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Oda Kodu</span>
                <div className="flex gap-1.5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs gap-1"
                    onClick={copyCode}
                    data-testid="button-copy-code"
                  >
                    {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    {copied ? "Kopyalandı" : "Kopyala"}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 px-2 text-xs gap-1 text-green-400"
                    onClick={shareWhatsApp}
                    data-testid="button-whatsapp"
                  >
                    <SiWhatsapp className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <div className="px-6 py-3 rounded-xl bg-gradient-to-br from-primary/10 to-red-500/5 border border-primary/20">
                  <DecryptedText 
                    text={roomCode || ""} 
                    className="text-3xl font-black tracking-[0.3em] text-primary"
                    speed={40}
                    characters="0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
                  />
                </div>
              </div>
            </motion.div>
          </SpotlightCard>

          {/* YouTube Connection */}
          {hasGuessModes && !googleStatusQuery.data?.connected && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4 rounded-2xl bg-gradient-to-br from-red-500/10 to-orange-500/5 border border-red-500/20"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <SiYoutube className="h-5 w-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold mb-0.5">YouTube Bağla</p>
                  <p className="text-xs text-muted-foreground">Tahmin modları için hesabını bağla</p>
                </div>
                <Button 
                  size="sm"
                  onClick={connectGoogle} 
                  className="h-9 gap-1.5 bg-white/10 hover:bg-white/20 text-white border-0"
                  data-testid="button-connect-google"
                >
                  <SiGoogle className="h-3.5 w-3.5" />
                  Bağlan
                </Button>
              </div>
            </motion.div>
          )}

          {hasGuessModes && googleStatusQuery.data?.connected && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-sm text-emerald-400"
            >
              <Check className="h-4 w-4" />
              YouTube Bağlı - Hazırsın!
            </motion.div>
          )}

          {/* Players */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                  <Users className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-sm font-semibold">Oyuncular</span>
              </div>
              {hasGuessModes && (
                <span className={`text-xs font-medium ${connectedCount === playerCount ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {connectedCount}/{playerCount} Hazır
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              <AnimatePresence mode="popLayout">
                {players.map((player, i) => {
                  const isReady = player.user.googleConnected || !hasGuessModes;
                  return (
                    <motion.div
                      key={player.id}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9, y: -10 }}
                      transition={{ delay: i * 0.05, type: "spring", stiffness: 300, damping: 25 }}
                      layout
                    >
                      {isReady ? (
                        <PulsingBorder 
                          active={true} 
                          color="#22c55e"
                        >
                          <div 
                            className="relative flex items-center gap-2 p-2.5 rounded-xl transition-all bg-gradient-to-br from-emerald-500/10 to-emerald-500/5"
                            data-testid={`card-player-${player.userId}`}
                          >
                            <div className="relative shrink-0">
                              <div className="w-9 h-9 rounded-lg overflow-hidden ring-2 ring-emerald-500/40">
                                {player.user.avatarUrl ? (
                                  <img src={player.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-muted flex items-center justify-center text-sm font-medium">
                                    {player.user.displayName?.charAt(0).toUpperCase()}
                                  </div>
                                )}
                              </div>
                              {player.userId === room.hostUserId && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                                  <Crown className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium truncate">{player.user.displayName}</p>
                              <p className="text-[10px] flex items-center gap-0.5 text-emerald-400">
                                <Check className="h-2.5 w-2.5" />Hazır
                              </p>
                            </div>
                            {isHost && player.userId !== userId && (
                              <button 
                                onClick={() => kickPlayerMutation.mutate(player.userId)}
                                className="absolute top-1 right-1 w-5 h-5 rounded-md bg-red-500/10 text-red-400 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                                data-testid={`button-kick-${player.userId}`}
                              >
                                <UserX className="h-3 w-3" />
                              </button>
                            )}
                          </div>
                        </PulsingBorder>
                      ) : (
                        <div 
                          className="relative flex items-center gap-2 p-2.5 rounded-xl transition-all bg-white/[0.02] border border-white/5"
                          data-testid={`card-player-${player.userId}`}
                        >
                          <div className="relative shrink-0">
                            <div className="w-9 h-9 rounded-lg overflow-hidden ring-2 ring-white/10">
                              {player.user.avatarUrl ? (
                                <img src={player.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center text-sm font-medium">
                                  {player.user.displayName?.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            {player.userId === room.hostUserId && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                                <Crown className="h-2.5 w-2.5 text-white" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{player.user.displayName}</p>
                            <p className="text-[10px] flex items-center gap-0.5 text-muted-foreground">
                              Bekliyor
                            </p>
                          </div>
                          {isHost && player.userId !== userId && (
                            <button 
                              onClick={() => kickPlayerMutation.mutate(player.userId)}
                              className="absolute top-1 right-1 w-5 h-5 rounded-md bg-red-500/10 text-red-400 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
                              data-testid={`button-kick-${player.userId}`}
                            >
                              <UserX className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>

              {/* Empty Slots */}
              {[...Array(Math.max(0, Math.min(maxPlayers, 6) - playerCount))].map((_, i) => (
                <div key={`empty-${i}`} className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[0.01] border border-dashed border-white/5">
                  <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                    <User className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                  <span className="text-xs text-muted-foreground/30">Boş</span>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Start Button */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                canStart ? "bg-gradient-to-br from-emerald-500 to-green-600" : "bg-white/10"
              }`}>
                <Play className={`h-5 w-5 ${canStart ? "text-white" : "text-muted-foreground"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{isHost ? "Oyunu Başlat" : "Bekleniyor"}</p>
                <p className="text-xs text-muted-foreground">
                  {!canStart && playerCount < 2 && "En az 2 oyuncu gerekli"}
                  {!canStart && playerCount >= 2 && !allConnected && hasGuessModes && "Herkes YouTube bağlamalı"}
                  {canStart && "Herkes hazır!"}
                  {!isHost && playerCount >= 2 && allConnected && "Host başlatacak..."}
                </p>
              </div>
              {isHost && (
                <ClickSpark sparkColor="#22c55e" sparkCount={10}>
                  <Button
                    onClick={() => startGameMutation.mutate()}
                    disabled={!canStart || startGameMutation.isPending}
                    className="h-10 px-5 gap-2 bg-gradient-to-r from-primary to-red-600 border-0"
                    data-testid="button-start-game"
                  >
                    {startGameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Başlat
                  </Button>
                </ClickSpark>
              )}
            </div>
          </motion.div>

        </div>
      </main>
    </div>
  );
}
