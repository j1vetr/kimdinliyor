import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Share2, Crown, Loader2, Users, Play, UserX, LogIn, Info, Zap, Timer, Check, ArrowRight } from "lucide-react";
import { SiYoutube, SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { PlayerCard } from "@/components/player-card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
        title: "Oyuncu atıldı",
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
        title: "Lobiye katıldın!",
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
        title: "YouTube bağlandı",
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
          title: "Link kopyalandı",
          description: "Paylaşım linki panoya kopyalandı.",
        });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link kopyalandı",
        description: "Paylaşım linki panoya kopyalandı.",
      });
    }
  }, [roomCode, roomQuery.data?.name, toast]);

  if (roomQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Lobi yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-center p-4 border-b border-border">
          <Logo height={56} />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md overflow-visible">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-destructive/10 mb-4">
                <SiYoutube className="h-7 w-7 text-destructive" />
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
            </CardContent>
          </Card>
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
  const disconnectedCount = players.filter(p => !p.user.googleConnected).length;
  const canStart = isHost && playerCount >= 2 && allGoogleConnected;
  
  const isUserInRoom = userId && players.some(p => p.userId === userId);
  const isFull = playerCount >= maxPlayers;

  if (!isUserInRoom) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-center p-4 border-b border-border">
          <Logo height={56} />
        </header>
        <main className="flex-1 p-4 md:p-8">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <h1 className="text-2xl md:text-3xl font-bold mb-2">{room.name}</h1>
              <p className="text-muted-foreground">
                {isFull ? "Bu lobi şu anda dolu." : "Lobiye katılmak için bilgilerini gir."}
              </p>
            </div>

            <Card className="overflow-visible mb-6">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-center gap-6">
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Oda Kodu</p>
                    <p className="font-mono text-2xl font-bold text-primary">{roomCode}</p>
                  </div>
                  <div className="h-12 w-px bg-border" />
                  <div className="text-center">
                    <p className="text-xs text-muted-foreground mb-1">Oyuncular</p>
                    <p className="text-2xl font-bold">{playerCount}/{maxPlayers}</p>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Zap className="h-4 w-4" />
                    <span>{room.totalRounds} tur</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" />
                    <span>{room.roundDuration} saniye</span>
                  </div>
                </div>
              </CardContent>
            </Card>
              
            {!isFull && (
              <Card className="overflow-visible mb-6">
                <CardContent className="p-5 md:p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinName" className="text-base font-semibold">Oyuncu Adın</Label>
                    <Input
                      id="joinName"
                      placeholder="Örnek: Ahmet"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                      disabled={isJoining}
                      className="h-12 text-base"
                      data-testid="input-join-name"
                    />
                  </div>
                  <Button
                    className="w-full h-12 text-base font-semibold gap-2"
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
                </CardContent>
              </Card>
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
              <Card className="overflow-visible">
                <CardContent className="p-5 md:p-6">
                  <p className="text-sm font-semibold mb-3">Lobideki Oyuncular</p>
                  <div className="flex flex-wrap gap-2">
                    {players.map((p) => (
                      <Badge key={p.id} variant="secondary" className="gap-1 py-1.5 px-3">
                        {p.userId === room.hostUserId && <Crown className="h-3 w-3 text-yellow-500" />}
                        {p.user.displayName}
                        {p.user.googleConnected && (
                          <Check className="h-3 w-3 text-green-500 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="relative flex items-center justify-center p-4 border-b border-border">
        <Link href="/" className="absolute left-4">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Logo height={48} />
        {isHost && (
          <div className="absolute right-4">
            <Badge variant="secondary" className="gap-1">
              <Crown className="h-3 w-3 text-yellow-500" />
              Oda Sahibi
            </Badge>
          </div>
        )}
      </header>

      <main className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto space-y-4">
          <Card className="overflow-visible">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                    <SiYoutube className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold">{room.name}</h2>
                    <p className="text-sm text-muted-foreground">
                      Oda Kodu: <span className="font-mono font-bold text-foreground">{roomCode}</span>
                    </p>
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

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold" data-testid="text-player-count">{playerCount}/{maxPlayers}</span>
                  <span className="text-muted-foreground">oyuncu</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span>{room.totalRounds} tur</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  <span>{room.roundDuration} saniye</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {!googleStatusQuery.data?.connected ? (
            <Card className="overflow-visible border-red-500/30 bg-red-500/5">
              <CardContent className="p-5 md:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-red-500/10 flex items-center justify-center shrink-0">
                      <SiYoutube className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold">YouTube Bağlanmadı</p>
                      <p className="text-sm text-muted-foreground">Oyuna katılmak için hesabını bağla.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      onClick={connectGoogle}
                      className="bg-white hover:bg-gray-100 text-gray-900 font-semibold gap-2 border border-gray-300"
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
                        <p>Giriş işlemi Google üzerinden güvenli şekilde gerçekleşir. Şifreni veya kişisel bilgilerini kaydetmiyoruz.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-visible border-green-500/30 bg-green-500/5">
              <CardContent className="p-4 md:p-5">
                <div className="flex items-center gap-3">
                  <div className="relative shrink-0">
                    <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                      <SiYoutube className="h-5 w-5 text-red-500" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 h-5 w-5 bg-green-500 rounded-full flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="font-semibold text-green-600 dark:text-green-400">YouTube Bağlı</p>
                    <p className="text-xs text-muted-foreground">Hesabın başarıyla bağlandı.</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="overflow-visible">
            <CardContent className="p-5 md:p-6">
              <h3 className="font-semibold flex items-center gap-2 mb-4">
                <Users className="h-5 w-5 text-primary" />
                Oyuncular ({playerCount}/{maxPlayers})
              </h3>
              <div className="space-y-2">
                {players.length === 0 ? (
                  <div className="p-6 text-center rounded-lg bg-muted/30">
                    <p className="text-muted-foreground">
                      Henüz kimse katılmadı. Arkadaşlarını davet et!
                    </p>
                  </div>
                ) : (
                  players.map((player, index) => {
                    const isPlayerHost = player.userId === room.hostUserId;
                    const canKick = isHost && !isPlayerHost && room.status !== "playing";
                    
                    return (
                      <div
                        key={player.id}
                        className={`animate-slide-up stagger-${Math.min(index + 1, 5)} flex items-center gap-2`}
                        style={{ animationFillMode: "backwards" }}
                      >
                        <div className="flex-1">
                          <PlayerCard
                            player={{
                              id: player.user.id,
                              displayName: player.user.displayName,
                              uniqueName: player.user.uniqueName,
                              googleConnected: player.user.googleConnected || false,
                              avatarUrl: player.user.avatarUrl || undefined,
                              totalScore: player.totalScore || 0,
                            }}
                            isHost={isPlayerHost}
                            showScore={false}
                          />
                        </div>
                        {canKick && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive shrink-0"
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
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          <div className="pt-2">
            {isHost ? (
              <div className="space-y-3">
                <Button
                  className="w-full h-14 text-lg font-semibold gap-3"
                  size="lg"
                  onClick={() => startGameMutation.mutate()}
                  disabled={!canStart || startGameMutation.isPending}
                  data-testid="button-start-game"
                >
                  {startGameMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Oyun başlatılıyor...
                    </>
                  ) : canStart ? (
                    <>
                      <Play className="h-5 w-5" />
                      Oyunu Başlat
                    </>
                  ) : playerCount < 2 ? (
                    <>
                      <Users className="h-5 w-5" />
                      En az 2 oyuncu gerekli
                    </>
                  ) : (
                    <>
                      <SiYoutube className="h-5 w-5" />
                      {disconnectedCount} oyuncu YouTube'a bağlanmalı
                    </>
                  )}
                </Button>
                {!allGoogleConnected && playerCount >= 2 && (
                  <p className="text-sm text-center text-muted-foreground">
                    Tüm oyuncuların YouTube hesabını bağlaması gerekiyor.
                  </p>
                )}
                {playerCount < 2 && (
                  <p className="text-sm text-center text-muted-foreground">
                    Oyunu başlatmak için en az 2 oyuncu gerekli.
                  </p>
                )}
              </div>
            ) : (
              <Card className="overflow-visible">
                <CardContent className="p-5 md:p-6 text-center">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-xl bg-primary/10 mb-3">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                  </div>
                  <p className="font-semibold mb-1">Oda sahibi bekleniyor</p>
                  <p className="text-sm text-muted-foreground">
                    Oda sahibinin oyunu başlatmasını bekliyorsun.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
