import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Share2, Crown, Loader2, Users, Play, UserX, Check, ArrowRight, Radio, Tv } from "lucide-react";
import { SiYoutube, SiGoogle, SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import type { RoomWithPlayers } from "@shared/schema";

interface GoogleStatus {
  connected: boolean;
}

function VUMeter({ level = 0.5, active = false }: { level?: number; active?: boolean }) {
  const bars = 8;
  const activeCount = Math.floor(level * bars);
  
  return (
    <div className="flex flex-col-reverse gap-[2px] h-12">
      {Array.from({ length: bars }).map((_, i) => {
        const isActive = active && i < activeCount;
        const color = i >= 6 ? "bg-red-500" : i >= 4 ? "bg-amber-400" : "bg-emerald-400";
        return (
          <motion.div
            key={i}
            animate={active ? { 
              opacity: isActive ? [0.8, 1, 0.8] : 0.15,
            } : { opacity: 0.15 }}
            transition={{ duration: 0.3 + Math.random() * 0.2, repeat: active ? Infinity : 0 }}
            className={`w-3 h-1 rounded-sm ${isActive ? color : "bg-muted-foreground/20"}`}
          />
        );
      })}
    </div>
  );
}

function LEDDigit({ char }: { char: string }) {
  return (
    <div className="relative">
      <div className="w-10 h-14 sm:w-12 sm:h-16 rounded-md bg-black/60 border border-primary/30 flex items-center justify-center shadow-inner overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent" />
        <span className="font-mono text-2xl sm:text-3xl font-bold text-primary drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
          {char}
        </span>
      </div>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-primary/20 blur-sm rounded-full" />
    </div>
  );
}

function SignalStrength({ strength = 3 }: { strength?: number }) {
  return (
    <div className="flex items-end gap-[2px] h-4">
      {[1, 2, 3, 4].map((level) => (
        <div
          key={level}
          className={`w-1 rounded-sm transition-colors ${
            level <= strength ? "bg-emerald-400" : "bg-muted-foreground/20"
          }`}
          style={{ height: `${level * 3 + 2}px` }}
        />
      ))}
    </div>
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Kopyalandı!",
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

  const shareWhatsApp = useCallback(() => {
    const shareUrl = `${window.location.origin}/oyun/${roomCode}`;
    const text = `Kim Dinliyor? oyununa katıl! Oda Kodu: ${roomCode} - ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, [roomCode]);

  if (roomQuery.isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary mx-auto"
          />
          <p className="text-muted-foreground mt-3 text-sm">Yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="h-screen bg-background flex flex-col">
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
            <p className="text-sm text-muted-foreground mb-4">Bu oda artık mevcut değil.</p>
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
  
  const guessModes = ["who_liked", "who_subscribed", "oldest_like"];
  const roomGameModes = room.gameModes || ["who_liked", "who_subscribed"];
  const hasGuessModes = roomGameModes.some(mode => guessModes.includes(mode));
  
  const allGoogleConnected = hasGuessModes 
    ? players.every(p => p.user.googleConnected)
    : true;
  const connectedCount = players.filter(p => p.user.googleConnected).length;
  const canStart = isHost && playerCount >= 2 && allGoogleConnected;
  
  const isUserInRoom = userId && players.some(p => p.userId === userId);
  const isFull = playerCount >= maxPlayers;

  if (!isUserInRoom) {
    return (
      <div className="h-screen bg-background flex flex-col">
        <header className="flex items-center justify-center p-3 border-b border-border/30 bg-background/90 backdrop-blur-sm">
          <Logo height={32} />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-sm"
          >
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <motion.div 
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className="h-2 w-2 rounded-full bg-primary"
                />
                <span className="text-xs font-semibold text-primary uppercase tracking-wide">Aktif Lobi</span>
              </div>
              <h1 className="text-xl font-bold mb-1">{room.name}</h1>
              <p className="text-sm text-muted-foreground">
                {isFull ? "Lobi dolu" : "Katılmak için adını gir"}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/50 mb-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Oda Kodu</span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-background/50">
                  <Users className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-mono font-medium">{playerCount}/{maxPlayers}</span>
                </div>
              </div>
              <div className="flex gap-2 justify-center">
                {roomCode?.split("").map((char, i) => (
                  <LEDDigit key={i} char={char} />
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
                  className="h-11 text-sm bg-background"
                  data-testid="input-join-name"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                />
                <Button
                  onClick={handleQuickJoin}
                  disabled={!joinName.trim() || isJoining}
                  className="w-full h-11 text-sm font-semibold gap-2"
                  data-testid="button-quick-join"
                >
                  {isJoining ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Katılınıyor
                    </>
                  ) : (
                    <>
                      Lobiye Katıl
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            )}

            {players.length > 0 && (
              <div className="mt-6 pt-5 border-t border-border/30">
                <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium mb-3">
                  Lobideki Oyuncular
                </p>
                <div className="flex flex-wrap gap-2">
                  {players.map((p) => (
                    <div 
                      key={p.id}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                        p.user.googleConnected 
                          ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" 
                          : "bg-muted/50 border border-border/30 text-muted-foreground"
                      }`}
                    >
                      {p.userId === room.hostUserId && <Crown className="h-3 w-3 text-amber-400" />}
                      <span>{p.user.displayName}</span>
                      {p.user.googleConnected && <Check className="h-3 w-3" />}
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
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Console Header */}
      <header className="shrink-0 flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-gradient-to-b from-muted/30 to-transparent">
        <Link href="/">
          <Button variant="ghost" size="icon" className="h-8 w-8" data-testid="button-back">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        
        <div className="flex items-center gap-2">
          <div className="hidden sm:block">
            <SignalStrength strength={connectedCount + 1} />
          </div>
          <Logo height={24} />
        </div>
        
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-muted/50 border border-border/40">
          <Users className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-mono font-bold">{playerCount}/{maxPlayers}</span>
        </div>
      </header>

      {/* Main Console Area */}
      <main className="flex-1 flex flex-col min-h-0 p-3 gap-3">
        
        {/* Room Code Console Panel */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="shrink-0 relative rounded-xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-muted/60 via-muted/40 to-muted/20 border border-border/50 rounded-xl" />
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          
          <div className="relative p-3">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="min-w-0">
                <h1 className="font-bold text-sm truncate" data-testid="text-room-name">{room.name}</h1>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                  <span data-testid="text-total-rounds">{room.totalRounds} tur</span>
                  <span className="text-border">|</span>
                  <span data-testid="text-round-duration">{room.roundDuration}sn</span>
                </div>
              </div>
              <VUMeter level={connectedCount / playerCount} active={allGoogleConnected} />
            </div>

            <div className="flex items-center gap-3" data-testid="display-room-code">
              <div className="flex gap-1.5 flex-1 justify-center">
                {roomCode?.split("").map((char, i) => (
                  <LEDDigit key={i} char={char} />
                ))}
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomCode}
                className="h-8 text-xs gap-1.5 bg-background/50"
                data-testid="button-copy-code"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Kopyalandı" : "Kopyala"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareRoom}
                className="h-8 text-xs gap-1.5 bg-background/50"
                data-testid="button-share"
              >
                <Share2 className="h-3.5 w-3.5" />
                Paylaş
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={shareWhatsApp}
                className="h-8 text-xs gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/20"
                data-testid="button-whatsapp"
              >
                <SiWhatsapp className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">WhatsApp</span>
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Connection Status - Only show if guess modes */}
        {hasGuessModes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="shrink-0"
          >
            {!googleStatusQuery.data?.connected ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <SiYoutube className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-amber-400">YouTube Bağla</p>
                    <p className="text-[10px] text-muted-foreground">Tahmin modları için gerekli</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={connectGoogle}
                  className="h-8 text-xs gap-1.5 bg-white hover:bg-gray-100 text-gray-900 border border-gray-300"
                  data-testid="button-connect-google"
                >
                  <SiGoogle className="h-3.5 w-3.5" />
                  Bağlan
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="h-8 w-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                  <Check className="h-4 w-4 text-emerald-400" />
                </div>
                <p className="text-xs font-bold text-emerald-400 flex-1">YouTube Bağlı</p>
                <VUMeter level={0.8} active />
              </div>
            )}
          </motion.div>
        )}

        {!hasGuessModes && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="shrink-0 flex items-center gap-2.5 p-2.5 rounded-xl bg-blue-500/5 border border-blue-500/20"
          >
            <div className="h-8 w-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Tv className="h-4 w-4 text-blue-400" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-blue-400">Karşılaştırma Modu</p>
              <p className="text-[10px] text-muted-foreground">YouTube girişi gerekmiyor</p>
            </div>
          </motion.div>
        )}

        {/* Players - Mixer Channels */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="flex-1 min-h-0 flex flex-col"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">
              Oyuncular
            </span>
            <span className={`text-[10px] font-bold ${allGoogleConnected ? "text-emerald-400" : "text-muted-foreground"}`} data-testid="text-player-status">
              {hasGuessModes ? `${connectedCount}/${playerCount} hazır` : `${playerCount} oyuncu`}
            </span>
          </div>

          <div className="flex-1 overflow-auto rounded-xl bg-muted/20 border border-border/30 p-2">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-2">
              {players.map((player, index) => {
                const isPlayerHost = player.userId === room.hostUserId;
                const canKick = isHost && !isPlayerHost && room.status !== "playing";
                const isConnected = hasGuessModes ? player.user.googleConnected : true;
                const isMe = player.userId === userId;
                
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    data-testid={`card-player-${player.userId}`}
                    className={`relative group p-2 rounded-lg border text-center ${
                      isConnected
                        ? "bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 border-emerald-500/30"
                        : "bg-muted/40 border-border/40"
                    } ${isMe ? "ring-1 ring-primary/40" : ""}`}
                  >
                    {isPlayerHost && (
                      <div className="absolute -top-1 -left-1 h-5 w-5 rounded-md bg-amber-500 flex items-center justify-center shadow-sm">
                        <Crown className="h-3 w-3 text-white" />
                      </div>
                    )}

                    {canKick && (
                      <button
                        onClick={() => kickPlayerMutation.mutate(player.userId)}
                        disabled={kickPlayerMutation.isPending}
                        className="absolute -top-1 -right-1 h-5 w-5 rounded-md bg-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-kick-${player.userId}`}
                      >
                        <UserX className="h-3 w-3 text-white" />
                      </button>
                    )}

                    <div className="relative mx-auto w-fit mb-1.5">
                      {player.user.avatarUrl ? (
                        <img 
                          src={player.user.avatarUrl} 
                          alt={player.user.displayName}
                          className={`h-10 w-10 rounded-full object-cover border-2 ${
                            isConnected ? "border-emerald-500/50" : "border-border/50"
                          }`}
                        />
                      ) : (
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                          isConnected 
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" 
                            : "bg-muted text-muted-foreground border-border/50"
                        }`}>
                          {player.user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background ${
                        isConnected ? "bg-emerald-400" : "bg-muted-foreground/40"
                      }`} />
                    </div>

                    <p className="text-[11px] font-semibold truncate">
                      {player.user.displayName}
                    </p>
                    
                    <div className="mt-1.5 mx-auto w-10 h-1.5 rounded-full bg-black/30 overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: isConnected ? "100%" : "30%" }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        className={`h-full rounded-full ${isConnected ? "bg-emerald-400" : "bg-muted-foreground/40"}`}
                      />
                    </div>
                  </motion.div>
                );
              })}

              {Array.from({ length: Math.min(maxPlayers - playerCount, 3) }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="p-2 rounded-lg border border-dashed border-border/30 bg-muted/10 flex flex-col items-center justify-center min-h-[90px]"
                >
                  <div className="h-10 w-10 rounded-full bg-muted/30 flex items-center justify-center mb-1">
                    <Users className="h-4 w-4 text-muted-foreground/30" />
                  </div>
                  <p className="text-[10px] text-muted-foreground/40">Boş</p>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Transport Bar Footer */}
      <footer className="shrink-0 p-3 border-t border-border/40 bg-gradient-to-t from-muted/30 to-transparent">
        {isHost ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between gap-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold truncate">
                {canStart ? "Oyuna Hazır!" : "Bekleniyor..."}
              </p>
              <p className="text-[10px] text-muted-foreground truncate">
                {!canStart && playerCount < 2 && "En az 2 oyuncu gerekli"}
                {!canStart && playerCount >= 2 && !allGoogleConnected && `${connectedCount}/${playerCount} oyuncu bağlı`}
                {canStart && "Tüm oyuncular hazır"}
              </p>
            </div>
            
            <Button
              onClick={() => startGameMutation.mutate()}
              disabled={!canStart || startGameMutation.isPending}
              size="lg"
              className="h-12 px-6 text-sm font-bold gap-2 shadow-lg"
              data-testid="button-start-game"
            >
              {startGameMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Başlatılıyor
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  OYUNU BAŞLAT
                </>
              )}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-3 py-2"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Radio className="h-4 w-4 text-muted-foreground" />
            </motion.div>
            <div className="text-center">
              <p className="text-xs font-semibold">Host Bekleniyor</p>
              <p className="text-[10px] text-muted-foreground">Oyun başladığında otomatik yönlendirileceksin</p>
            </div>
          </motion.div>
        )}
      </footer>
    </div>
  );
}
