import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Share2, Crown, Loader2, Users, Play, UserX, Zap, Timer, Check, ArrowRight, Radio, Tv } from "lucide-react";
import { SiYoutube, SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import type { RoomWithPlayers } from "@shared/schema";

interface GoogleStatus {
  connected: boolean;
}

function EqualizerBars({ active = false, count = 5 }: { active?: boolean; count?: number }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          animate={active ? { 
            height: [4, 12 + Math.random() * 4, 6, 14, 4],
          } : { height: 4 }}
          transition={{ 
            duration: 0.8 + Math.random() * 0.4, 
            repeat: active ? Infinity : 0,
            delay: i * 0.1 
          }}
          className={`w-[3px] rounded-sm ${active ? "bg-primary" : "bg-muted-foreground/30"}`}
          style={{ height: 4 }}
        />
      ))}
    </div>
  );
}

function SignalDot({ active = false, delay = 0 }: { active?: boolean; delay?: number }) {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0.5 }}
      animate={active ? { 
        scale: [0.8, 1, 0.8],
        opacity: [0.5, 1, 0.5],
      } : { scale: 0.8, opacity: 0.3 }}
      transition={{ duration: 1.5, repeat: Infinity, delay }}
      className={`h-2 w-2 rounded-full ${active ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
    />
  );
}

export default function Lobby() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomCode = params.code?.toUpperCase();
  const [userId, setUserId] = useState<string | null>(localStorage.getItem("userId"));
  const [joinName, setJoinName] = useState("");
  const [isJoining, setIsJoining] = useState(false);
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
    onSuccess: () => {
      setLocation(`/oyun/${roomCode}/game`);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Oyun başlatılamadı.",
        variant: "destructive",
      });
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] });
      toast({
        title: "Oyuncu Atıldı",
        description: "Oyuncu odadan çıkarıldı.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Oyuncu atılamadı.",
        variant: "destructive",
      });
    },
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
      
      toast({
        title: "Lobiye Katıldın!",
        description: "YouTube hesabını bağlamayı unutma.",
      });
    } catch (error: any) {
      toast({
        title: "Hata",
        description: error.message || "Lobiye katılınamadı.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const connectGoogle = useCallback(async () => {
    try {
      const response = await fetch(`/api/google/auth-url?userId=${userId}&roomCode=${roomCode}`);
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast({
          title: "Hata",
          description: "Google bağlantı adresi alınamadı.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Hata",
        description: "Google bağlantısı başlatılamadı.",
        variant: "destructive",
      });
    }
  }, [userId, roomCode, toast]);

  useEffect(() => {
    const dataUpdatedAt = roomQuery.dataUpdatedAt || 0;
    const isFreshData = dataUpdatedAt > mountTimeRef.current;
    const isIdle = roomQuery.fetchStatus === "idle";
    const isSuccess = roomQuery.status === "success";
    
    if (roomQuery.data?.status === "playing" && isFreshData && isIdle && isSuccess) {
      setLocation(`/oyun/${roomCode}/game`);
    }
  }, [roomQuery.data?.status, roomQuery.dataUpdatedAt, roomQuery.fetchStatus, roomQuery.status, roomCode, setLocation]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("google_connected") === "true") {
      toast({
        title: "YouTube Bağlandı",
        description: "Google hesabın başarıyla bağlandı.",
      });
      window.history.replaceState({}, "", window.location.pathname);
      queryClient.invalidateQueries({ queryKey: ["/api/google/status", userId] });
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] });
    }
  }, [toast, userId, roomCode]);

  const copyRoomCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(roomCode!);
      toast({
        title: "Kopyalandı",
        description: "Oda kodu panoya kopyalandı.",
      });
    } catch {
      toast({
        title: "Hata",
        description: "Kopyalanamadı.",
        variant: "destructive",
      });
    }
  }, [roomCode, toast]);

  const shareRoom = useCallback(async () => {
    const shareUrl = `${window.location.origin}/oyun/${roomCode}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: roomQuery.data?.name || "Kim Dinliyor?",
          text: "Kim Dinliyor? oyununa katıl!",
          url: shareUrl,
        });
      } catch {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link Kopyalandı",
          description: "Paylaşım linki panoya kopyalandı.",
        });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link Kopyalandı",
        description: "Paylaşım linki panoya kopyalandı.",
      });
    }
  }, [roomCode, roomQuery.data?.name, toast]);

  if (roomQuery.isLoading) {
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
              className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary mx-auto"
            />
          </div>
          <p className="text-muted-foreground mt-3 text-sm">Yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-center p-3 border-b border-border/30">
          <Logo height={36} />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-sm"
          >
            <div className="h-14 w-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Tv className="h-7 w-7 text-destructive" />
            </div>
            <h2 className="text-lg font-bold mb-1">Oda Bulunamadı</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Bu oda artık mevcut değil.
            </p>
            <Link href="/">
              <Button size="sm" className="gap-1.5">
                <ArrowLeft className="h-3.5 w-3.5" />
                Ana Sayfa
              </Button>
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  const room = roomQuery.data;
  const players = room.players || [];
  const isHost = room.hostUserId === userId;
  const playerCount = players.length;
  const maxPlayers = room.maxPlayers || 8;
  const allGoogleConnected = players.every(p => p.user.googleConnected);
  const connectedCount = players.filter(p => p.user.googleConnected).length;
  const canStart = isHost && playerCount >= 2 && allGoogleConnected;
  
  const isUserInRoom = userId && players.some(p => p.userId === userId);
  const isFull = playerCount >= maxPlayers;

  if (!isUserInRoom) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-center p-3 border-b border-border/30 bg-background/90 backdrop-blur-sm">
          <Logo height={32} />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xs"
          >
            <div className="text-center mb-5">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 mb-3">
                <motion.div 
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="h-1.5 w-1.5 rounded-full bg-primary"
                />
                <span className="text-[10px] font-medium text-primary uppercase tracking-wide">Aktif Lobi</span>
              </div>
              <h1 className="text-lg font-bold mb-0.5">{room.name}</h1>
              <p className="text-xs text-muted-foreground">
                {isFull ? "Lobi dolu" : "Katılmak için adını gir"}
              </p>
            </div>

            <div className="p-3 rounded-lg bg-muted/30 border border-border/40 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Oda Kodu</span>
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">{playerCount}/{maxPlayers}</span>
                </div>
              </div>
              <div className="flex gap-1">
                {roomCode?.split("").map((char, i) => (
                  <div
                    key={i}
                    className="flex-1 h-8 rounded bg-background border border-border/50 flex items-center justify-center font-mono font-bold text-sm"
                  >
                    {char}
                  </div>
                ))}
              </div>
            </div>

            {!isFull && (
              <div className="space-y-3">
                <Input
                  placeholder="Adın"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={20}
                  className="h-10 text-sm bg-background"
                  data-testid="input-join-name"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                />
                <Button
                  onClick={handleQuickJoin}
                  disabled={!joinName.trim() || isJoining}
                  className="w-full h-10 text-sm gap-1.5"
                  data-testid="button-quick-join"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Katılınıyor
                    </>
                  ) : (
                    <>
                      Lobiye Katıl
                      <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {players.length > 0 && (
              <div className="mt-5 pt-4 border-t border-border/30">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
                  Lobideki Oyuncular
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {players.map((p, i) => (
                    <div 
                      key={p.id}
                      className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs ${
                        p.user.googleConnected 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                          : "bg-muted/50 border border-border/30 text-muted-foreground"
                      }`}
                    >
                      {p.userId === room.hostUserId && <Crown className="h-2.5 w-2.5 text-amber-400" />}
                      <span className="font-medium">{p.user.displayName}</span>
                      {p.user.googleConnected && <Check className="h-2.5 w-2.5" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Minimal Header */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Logo height={28} />
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={copyRoomCode} data-testid="button-copy-code">
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Kodu Kopyala</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={shareRoom} data-testid="button-share">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Paylaş</TooltipContent>
          </Tooltip>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-3 py-4 space-y-4">
          
          {/* Room Console Panel */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative"
          >
            {/* Console Background */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-b from-muted/60 to-muted/20 border border-border/40" />
            
            {/* Console Content */}
            <div className="relative p-3">
              {/* Top Bar - Room Info */}
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-lg bg-primary/90 flex items-center justify-center">
                      <SiYoutube className="h-5 w-5 text-white" />
                    </div>
                    <motion.div 
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 border border-background"
                    />
                  </div>
                  <div className="min-w-0">
                    <h1 className="font-bold text-sm truncate">{room.name}</h1>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <span className="font-mono">{roomCode}</span>
                      <span>|</span>
                      <span>{room.totalRounds} tur</span>
                      <span>|</span>
                      <span>{room.roundDuration}sn</span>
                    </div>
                  </div>
                </div>
                
                {/* Status Indicators */}
                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-1">
                    <SignalDot active={connectedCount >= 1} delay={0} />
                    <SignalDot active={connectedCount >= 2} delay={0.1} />
                    <SignalDot active={connectedCount >= 3} delay={0.2} />
                  </div>
                  <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-background/60 border border-border/40">
                    <Users className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-mono font-medium">{playerCount}/{maxPlayers}</span>
                  </div>
                </div>
              </div>

              {/* Divider with Equalizer */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-border/50" />
                <EqualizerBars active={allGoogleConnected} count={7} />
                <div className="flex-1 h-px bg-border/50" />
              </div>

              {/* Connection Status Section */}
              {!googleStatusQuery.data?.connected ? (
                <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-md bg-amber-500/20 flex items-center justify-center">
                      <SiYoutube className="h-4 w-4 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-amber-400">YouTube Bağla</p>
                      <p className="text-[10px] text-muted-foreground">Oyun için gerekli</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={connectGoogle}
                    className="h-7 text-xs gap-1.5 bg-white hover:bg-gray-100 text-gray-900 border border-gray-300"
                    data-testid="button-connect-google"
                  >
                    <SiGoogle className="h-3 w-3" />
                    Bağlan
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <div className="h-7 w-7 rounded-md bg-emerald-500/20 flex items-center justify-center">
                    <Check className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-emerald-400">YouTube Bağlı</p>
                  </div>
                  <EqualizerBars active count={4} />
                </div>
              )}
            </div>
          </motion.div>

          {/* Players Grid - Channel Faders Style */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                Oyuncular
              </span>
              <div className="flex items-center gap-1">
                <span className={`text-[10px] font-medium ${allGoogleConnected ? "text-emerald-400" : "text-muted-foreground"}`}>
                  {connectedCount}/{playerCount} hazır
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
              {players.map((player, index) => {
                const isPlayerHost = player.userId === room.hostUserId;
                const canKick = isHost && !isPlayerHost && room.status !== "playing";
                const isConnected = player.user.googleConnected;
                const isMe = player.userId === userId;
                
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className={`relative group p-2.5 rounded-lg border transition-all ${
                      isConnected
                        ? "bg-emerald-500/5 border-emerald-500/30"
                        : "bg-muted/30 border-border/40"
                    } ${isMe ? "ring-1 ring-primary/30" : ""}`}
                  >
                    {/* Host Badge */}
                    {isPlayerHost && (
                      <div className="absolute -top-1 -left-1 h-4 w-4 rounded bg-amber-500 flex items-center justify-center">
                        <Crown className="h-2.5 w-2.5 text-white" />
                      </div>
                    )}

                    {/* Kick Button */}
                    {canKick && (
                      <button
                        onClick={() => kickPlayerMutation.mutate(player.userId)}
                        disabled={kickPlayerMutation.isPending}
                        className="absolute -top-1 -right-1 h-4 w-4 rounded bg-destructive/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-kick-${player.userId}`}
                      >
                        <UserX className="h-2.5 w-2.5 text-white" />
                      </button>
                    )}

                    {/* Player Content */}
                    <div className="flex flex-col items-center text-center">
                      {/* Avatar */}
                      <div className="relative mb-1.5">
                        {player.user.avatarUrl ? (
                          <img 
                            src={player.user.avatarUrl} 
                            alt={player.user.displayName}
                            className={`h-10 w-10 rounded-lg object-cover ${
                              isConnected ? "ring-1 ring-emerald-500/50" : ""
                            }`}
                          />
                        ) : (
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center text-sm font-bold ${
                            isConnected 
                              ? "bg-emerald-500/20 text-emerald-400" 
                              : "bg-muted text-muted-foreground"
                          }`}>
                            {player.user.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        {/* Status LED */}
                        <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                          isConnected ? "bg-emerald-400" : "bg-muted-foreground/40"
                        }`} />
                      </div>

                      {/* Name */}
                      <p className="text-[11px] font-medium truncate w-full max-w-[80px]">
                        {player.user.displayName}
                      </p>
                      
                      {/* Status Text */}
                      <p className={`text-[9px] ${isConnected ? "text-emerald-400" : "text-muted-foreground"}`}>
                        {isConnected ? "Hazır" : "Bekliyor"}
                      </p>

                      {/* Mini Fader Visual */}
                      <div className="mt-1.5 w-8 h-1 rounded-full bg-muted overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: isConnected ? "100%" : "30%" }}
                          transition={{ duration: 0.5, delay: index * 0.1 }}
                          className={`h-full rounded-full ${isConnected ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Empty Slots */}
              {Array.from({ length: Math.min(maxPlayers - playerCount, 4) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-2.5 rounded-lg border border-dashed border-border/30 bg-muted/10 flex flex-col items-center justify-center min-h-[100px]"
                >
                  <div className="h-10 w-10 rounded-lg bg-muted/30 flex items-center justify-center mb-1.5">
                    <Users className="h-4 w-4 text-muted-foreground/40" />
                  </div>
                  <p className="text-[10px] text-muted-foreground/50">Boş slot</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Host Controls */}
          {isHost && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 rounded-xl bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Play className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold">Host Kontrolü</p>
                    <p className="text-[10px] text-muted-foreground">
                      {!canStart && playerCount < 2 && "En az 2 oyuncu gerekli"}
                      {!canStart && playerCount >= 2 && !allGoogleConnected && `${connectedCount}/${playerCount} oyuncu bağlı`}
                      {canStart && "Tüm oyuncular hazır!"}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => startGameMutation.mutate()}
                  disabled={!canStart || startGameMutation.isPending}
                  size="sm"
                  className="h-9 px-4 text-sm font-semibold gap-1.5 shadow-md"
                  data-testid="button-start-game"
                >
                  {startGameMutation.isPending ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Başlatılıyor
                    </>
                  ) : (
                    <>
                      <Play className="h-3.5 w-3.5" />
                      Başlat
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Non-Host Waiting State */}
          {!isHost && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="p-3 rounded-xl bg-muted/30 border border-border/40 text-center"
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                >
                  <Radio className="h-4 w-4 text-muted-foreground" />
                </motion.div>
                <span className="text-xs font-medium">Host bekleniyor</span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Host oyunu başlattığında otomatik olarak yönlendirileceksin
              </p>
            </motion.div>
          )}

        </div>
      </main>
    </div>
  );
}
