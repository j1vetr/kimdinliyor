import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Share2, Crown, Loader2, Users, Play, UserX, Info, Zap, Timer, Check, ArrowRight, Radio, Tv, Mic2, Signal } from "lucide-react";
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

export default function Lobby() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomCode = params.code?.toUpperCase();
  const [userId, setUserId] = useState<string | null>(localStorage.getItem("userId"));
  const [joinName, setJoinName] = useState("");
  const [isJoining, setIsJoining] = useState(false);

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
    if (roomQuery.data?.status === "playing") {
      setLocation(`/oyun/${roomCode}/game`);
    }
  }, [roomQuery.data?.status, roomCode, setLocation]);

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
              className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary mx-auto"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Radio className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground mt-4">Lobi Yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-center p-4 border-b border-border/50">
          <Logo height={48} />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <div className="relative inline-block mb-6">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
                <Tv className="h-10 w-10 text-destructive" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Oda Bulunamadı</h2>
            <p className="text-muted-foreground mb-6">
              Bu oda artık mevcut değil veya silinmiş olabilir.
            </p>
            <Link href="/">
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Ana Sayfaya Dön
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
        <header className="flex items-center justify-center p-4 border-b border-border/50 backdrop-blur-sm bg-background/80">
          <Logo height={48} />
        </header>
        <main className="flex-1 relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
            <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-amber-500 blur-3xl" />
          </div>

          <div className="relative max-w-xl mx-auto px-4 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <motion.div 
                animate={{ 
                  boxShadow: ["0 0 0 0 rgba(255,0,0,0)", "0 0 0 12px rgba(255,0,0,0.1)", "0 0 0 0 rgba(255,0,0,0)"]
                }}
                transition={{ duration: 2, repeat: Infinity }}
                className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-red-600 mb-4 shadow-lg shadow-primary/30"
              >
                <Tv className="h-8 w-8 text-white" />
              </motion.div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{room.name}</h1>
              <p className="text-muted-foreground">
                {isFull ? "Bu Lobi Şu Anda Dolu" : "Lobiye Katılmak İçin Bilgilerini Gir"}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-6"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-primary font-medium mb-1">Katılım Kodu</p>
                  <div className="flex gap-1">
                    {roomCode?.split("").map((char, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="h-10 w-8 rounded-lg bg-muted flex items-center justify-center font-mono font-bold text-xl"
                      >
                        {char}
                      </motion.div>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground mb-1">Oyuncular</p>
                  <p className="text-2xl font-bold">{playerCount}<span className="text-muted-foreground">/{maxPlayers}</span></p>
                </div>
              </div>

              <div className="flex items-center gap-3 mt-4 pt-4 border-t border-primary/10">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                  <Zap className="h-3.5 w-3.5 text-amber-500" />
                  <span className="text-xs font-medium">{room.totalRounds} Tur</span>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                  <Timer className="h-3.5 w-3.5 text-blue-500" />
                  <span className="text-xs font-medium">{room.roundDuration} Saniye</span>
                </div>
              </div>
            </motion.div>
              
            {!isFull && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative mb-6"
              >
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-emerald-500/50 to-transparent rounded-full" />
                <div className="pl-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Mic2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Sahne Adın</h2>
                      <p className="text-xs text-muted-foreground">Diğer Oyunculara Görünecek İsim</p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <Input
                      placeholder="Örnek: Ahmet"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                      disabled={isJoining}
                      className="h-14 text-lg pl-5 bg-muted/30 border-border/50 focus:border-emerald-500/50 transition-all"
                      data-testid="input-join-name"
                    />
                    <Button
                      className="w-full h-12 text-base font-semibold gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25"
                      onClick={handleQuickJoin}
                      disabled={!joinName.trim() || isJoining}
                      data-testid="button-quick-join"
                    >
                      {isJoining ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Katılınıyor...
                        </>
                      ) : (
                        <>
                          Lobiye Katıl
                          <ArrowRight className="h-5 w-5" />
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
              
            {isFull && (
              <div className="text-center">
                <Link href="/">
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Ana Sayfaya Dön
                  </Button>
                </Link>
              </div>
            )}
              
            {players.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="p-5 rounded-2xl bg-muted/20 border border-border/30"
              >
                <p className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Lobideki Oyuncular
                </p>
                <div className="flex flex-wrap gap-2">
                  {players.map((p, i) => (
                    <motion.div 
                      key={p.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl ${
                        p.user.googleConnected 
                          ? "bg-emerald-500/10 border border-emerald-500/20" 
                          : "bg-muted/50 border border-border/30"
                      }`}
                    >
                      {p.userId === room.hostUserId && <Crown className="h-3.5 w-3.5 text-amber-500" />}
                      <span className="text-sm font-medium">{p.user.displayName}</span>
                      {p.user.googleConnected && (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="relative flex items-center justify-center p-4 border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <Link href="/" className="absolute left-4">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Logo height={40} />
        {isHost && (
          <div className="absolute right-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <Crown className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-medium text-amber-500">Yayın Yöneticisi</span>
          </div>
        )}
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-10 left-20 w-72 h-72 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-20 right-10 w-56 h-56 rounded-full bg-emerald-500 blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            
            <div className="flex-1 space-y-5">
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full" />
                <div className="pl-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                    <div className="flex items-center justify-between gap-4 mb-4">
                      <div className="flex items-center gap-4">
                        <motion.div 
                          animate={{ 
                            boxShadow: ["0 0 0 0 rgba(255,0,0,0)", "0 0 0 8px rgba(255,0,0,0.15)", "0 0 0 0 rgba(255,0,0,0)"]
                          }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-red-600 flex items-center justify-center shadow-lg shadow-primary/30"
                        >
                          <Tv className="h-7 w-7 text-white" />
                        </motion.div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <motion.div 
                              animate={{ opacity: [1, 0.5, 1] }}
                              transition={{ duration: 1.5, repeat: Infinity }}
                              className="h-2 w-2 rounded-full bg-red-500"
                            />
                            <span className="text-xs text-red-500 font-medium">Canlı Yayın</span>
                          </div>
                          <h2 className="text-xl font-bold">{room.name}</h2>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={copyRoomCode} data-testid="button-copy-code">
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Kodu Kopyala</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon" onClick={shareRoom} data-testid="button-share">
                              <Share2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Paylaş</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-4">
                      <p className="text-xs text-muted-foreground">Katılım Kodu:</p>
                      <div className="flex gap-1">
                        {roomCode?.split("").map((char, i) => (
                          <div
                            key={i}
                            className="h-8 w-7 rounded-md bg-muted flex items-center justify-center font-mono font-bold"
                          >
                            {char}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium" data-testid="text-player-count">{playerCount}/{maxPlayers} Oyuncu</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-medium">{room.totalRounds} Tur</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                        <Timer className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium">{room.roundDuration} Saniye</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative"
              >
                <div className={`absolute -left-4 top-0 bottom-0 w-1 rounded-full ${
                  googleStatusQuery.data?.connected 
                    ? "bg-gradient-to-b from-emerald-500 via-emerald-500/50 to-transparent"
                    : "bg-gradient-to-b from-amber-500 via-amber-500/50 to-transparent"
                }`} />
                <div className="pl-4">
                  {!googleStatusQuery.data?.connected ? (
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                              <SiYoutube className="h-6 w-6 text-white" />
                            </div>
                            <motion.div
                              animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center"
                            >
                              <span className="text-[10px] text-white font-bold">!</span>
                            </motion.div>
                          </div>
                          <div>
                            <h3 className="font-bold">YouTube Bağlantısı Gerekli</h3>
                            <p className="text-xs text-muted-foreground">Oyuna Katılmak İçin Hesabını Bağla</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            onClick={connectGoogle}
                            className="bg-white hover:bg-gray-100 text-gray-900 font-semibold gap-2 border border-gray-300 shadow-lg"
                            data-testid="button-connect-google"
                          >
                            <SiGoogle className="h-4 w-4" />
                            Bağlan
                          </Button>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" data-testid="button-google-info">
                                <Info className="h-4 w-4 text-muted-foreground" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom" className="max-w-xs text-center">
                              <p>Giriş işlemi Google üzerinden güvenli şekilde gerçekleşir.</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
                            <SiYoutube className="h-5 w-5 text-white" />
                          </div>
                          <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-background">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold text-emerald-500">YouTube Bağlı</p>
                          <p className="text-xs text-muted-foreground">Hesabın Başarıyla Bağlandı</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {isHost && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative"
                >
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-purple-500/50 to-transparent rounded-full" />
                  <div className="pl-4">
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-transparent border border-purple-500/20">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                            <Play className="h-6 w-6 text-white" />
                          </div>
                          <div>
                            <h3 className="font-bold">Yayın Kontrol Paneli</h3>
                            <p className="text-xs text-muted-foreground">
                              {!canStart && playerCount < 2 && "En Az 2 Oyuncu Gerekli"}
                              {!canStart && playerCount >= 2 && !allGoogleConnected && `${connectedCount}/${playerCount} Oyuncu Bağlı`}
                              {canStart && "Tüm Oyuncular Hazır!"}
                            </p>
                          </div>
                        </div>
                        <Button
                          onClick={() => startGameMutation.mutate()}
                          disabled={!canStart || startGameMutation.isPending}
                          className="bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 shadow-lg shadow-purple-500/25 gap-2"
                          data-testid="button-start-game"
                        >
                          {startGameMutation.isPending ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Başlatılıyor...
                            </>
                          ) : (
                            <>
                              <Play className="h-5 w-5" />
                              Yayını Başlat
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            <div className="lg:w-80">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-24"
              >
                <div className="p-5 rounded-2xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/30">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Signal className="h-4 w-4 text-primary" />
                      <h3 className="font-bold">Sahne Arkası</h3>
                    </div>
                    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                      <motion.div 
                        animate={{ opacity: [1, 0.3, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="h-1.5 w-1.5 rounded-full bg-emerald-500"
                      />
                      <span className="text-[10px] font-medium text-emerald-500">{connectedCount}/{playerCount} Hazır</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {players.length === 0 ? (
                      <div className="p-6 text-center rounded-xl bg-muted/30">
                        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Oyuncu Bekleniyor...</p>
                      </div>
                    ) : (
                      players.map((player, index) => {
                        const isPlayerHost = player.userId === room.hostUserId;
                        const canKick = isHost && !isPlayerHost && room.status !== "playing";
                        
                        return (
                          <motion.div
                            key={player.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                              player.user.googleConnected
                                ? "bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20"
                                : "bg-muted/30 border border-border/30"
                            }`}
                          >
                            <div className="relative">
                              {player.user.avatarUrl ? (
                                <img 
                                  src={player.user.avatarUrl} 
                                  alt={player.user.displayName}
                                  className="h-10 w-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-sm font-bold">{player.user.displayName.charAt(0).toUpperCase()}</span>
                                </div>
                              )}
                              {player.user.googleConnected && (
                                <div className="absolute -bottom-0.5 -right-0.5 h-4 w-4 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-background">
                                  <Check className="h-2.5 w-2.5 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                {isPlayerHost && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                <p className="font-medium text-sm truncate">{player.user.displayName}</p>
                              </div>
                              <p className={`text-xs ${player.user.googleConnected ? "text-emerald-500" : "text-muted-foreground"}`}>
                                {player.user.googleConnected ? "Hazır" : "YouTube Bekleniyor"}
                              </p>
                            </div>
                            {canKick && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive shrink-0"
                                    onClick={() => kickPlayerMutation.mutate(player.userId)}
                                    disabled={kickPlayerMutation.isPending}
                                    data-testid={`button-kick-${player.userId}`}
                                  >
                                    <UserX className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Oyuncuyu At</TooltipContent>
                              </Tooltip>
                            )}
                          </motion.div>
                        );
                      })
                    )}
                  </div>

                  {!isHost && (
                    <div className="mt-4 pt-4 border-t border-border/30">
                      <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30">
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                        <div>
                          <p className="text-sm font-medium">Yayın Başlayacak</p>
                          <p className="text-xs text-muted-foreground">Yönetici Oyunu Başlatacak</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
