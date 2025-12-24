import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Share2, Crown, Loader2, Users, Play, ExternalLink, UserX, Smartphone, Speaker, Laptop, RefreshCw, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SpotifyIcon } from "@/components/spotify-icon";
import { Logo } from "@/components/logo";
import { PlayerCard } from "@/components/player-card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { RoomWithPlayers } from "@shared/schema";

interface SpotifyStatus {
  connected: boolean;
}

interface SpotifyDevice {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  volumePercent: number | null;
}

interface DevicesResponse {
  devices: SpotifyDevice[];
  selectedDeviceId: string | null;
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

  const spotifyStatusQuery = useQuery<SpotifyStatus>({
    queryKey: ["/api/spotify/status", userId],
    queryFn: async () => {
      const response = await fetch(`/api/spotify/status?userId=${userId}`);
      return response.json();
    },
    enabled: !!userId,
    refetchInterval: 3000,
  });

  const devicesQuery = useQuery<DevicesResponse>({
    queryKey: ["/api/spotify/devices", userId],
    queryFn: async () => {
      const response = await fetch(`/api/spotify/devices?userId=${userId}`);
      return response.json();
    },
    enabled: !!userId && spotifyStatusQuery.data?.connected,
    refetchInterval: 5000,
  });

  const selectDeviceMutation = useMutation({
    mutationFn: async (deviceId: string) => {
      const response = await apiRequest("POST", "/api/spotify/select-device", {
        userId,
        deviceId,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/spotify/devices", userId] });
      toast({
        title: "Cihaz seçildi",
        description: "Şarkılar bu cihazda çalacak.",
      });
    },
    onError: () => {
      toast({
        title: "Hata",
        description: "Cihaz seçilemedi.",
        variant: "destructive",
      });
    },
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
        description: "Spotify hesabını bağlamayı unutma.",
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

  const connectSpotify = useCallback(async () => {
    try {
      const response = await fetch(`/api/spotify/auth-url?userId=${userId}&roomCode=${roomCode}`);
      const data = await response.json();
      if (data.authUrl) {
        window.location.href = data.authUrl;
      } else {
        toast({
          title: "Hata",
          description: "Spotify bağlantı URL'si alınamadı.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Hata",
        description: "Spotify bağlantısı başlatılamadı.",
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
    if (urlParams.get("spotify_connected") === "true") {
      toast({
        title: "Spotify Bağlandı",
        description: "Spotify hesabınız başarıyla bağlandı.",
      });
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

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
          title: roomQuery.data?.name || "Spotify Oda Oyunu",
          text: "Spotify Oda Oyununa katıl!",
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

  const getDeviceIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case "smartphone":
        return <Smartphone className="h-4 w-4" />;
      case "speaker":
        return <Speaker className="h-4 w-4" />;
      default:
        return <Laptop className="h-4 w-4" />;
    }
  };

  if (roomQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <Card className="w-full max-w-md text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Oda Bulunamadı</h2>
            <p className="text-muted-foreground mb-6">
              Bu oda artık mevcut değil veya silinmiş olabilir.
            </p>
            <Link href="/">
              <Button>Ana Sayfaya Dön</Button>
            </Link>
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
  const allSpotifyConnected = players.every(p => p.user.spotifyConnected);
  const disconnectedCount = players.filter(p => !p.user.spotifyConnected).length;
  const hasSelectedDevice = !!devicesQuery.data?.selectedDeviceId;
  const canStart = isHost && playerCount >= 2 && allSpotifyConnected;
  
  const isUserInRoom = userId && players.some(p => p.userId === userId);
  const isFull = playerCount >= maxPlayers;

  if (!isUserInRoom) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-center p-4 border-b border-border">
          <Logo height={56} />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{room.name}</CardTitle>
              <p className="text-muted-foreground">
                {isFull ? "Bu lobi dolu" : "Lobiye katılmak için ismini gir"}
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/50">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Oda Kodu</p>
                  <p className="font-mono text-xl font-bold text-primary">{roomCode}</p>
                </div>
                <div className="h-10 w-px bg-border" />
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">Oyuncular</p>
                  <p className="text-xl font-bold">{playerCount}/{maxPlayers}</p>
                </div>
              </div>
              
              {!isFull && (
                <div className="space-y-3">
                  <Input
                    placeholder="Adını gir..."
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                    disabled={isJoining}
                    data-testid="input-join-name"
                  />
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleQuickJoin}
                    disabled={!joinName.trim() || isJoining}
                    data-testid="button-quick-join"
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Katılınıyor...
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 mr-2" />
                        Lobiye Katıl
                      </>
                    )}
                  </Button>
                </div>
              )}
              
              {isFull && (
                <div className="text-center">
                  <Link href="/">
                    <Button variant="outline">Ana Sayfaya Dön</Button>
                  </Link>
                </div>
              )}
              
              {players.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-2">Lobideki oyuncular:</p>
                  <div className="flex flex-wrap gap-2">
                    {players.map((p) => (
                      <Badge key={p.id} variant="secondary">
                        {p.userId === room.hostUserId && <Crown className="h-3 w-3 mr-1" />}
                        {p.user.displayName}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Logo height={48} />
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            {roomCode}
          </Badge>
        </div>
      </header>

      <main className="flex-1 flex flex-col p-4 md:p-8 gap-6 max-w-4xl mx-auto w-full">
        <Card className="animate-fade-in">
          <CardHeader className="pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl">{room.name}</CardTitle>
                <p className="text-muted-foreground mt-1">
                  Oyuncular toplanıyor...
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyRoomCode}
                  data-testid="button-copy-code"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={shareRoom}
                  data-testid="button-share"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Oda Kodu</p>
                  <p className="font-mono text-lg font-bold text-primary">{roomCode}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Oyuncular</p>
                <p className="text-2xl font-bold" data-testid="text-player-count">
                  {playerCount}/{maxPlayers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Users className="h-5 w-5" />
            Oyuncular
          </h3>
          <div className="grid gap-2">
            {players.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">
                  Henüz kimse katılmadı. Arkadaşlarını davet et!
                </p>
              </Card>
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
                          spotifyConnected: player.user.spotifyConnected || false,
                          totalScore: player.totalScore || 0,
                        }}
                        isHost={isPlayerHost}
                        showScore={false}
                      />
                    </div>
                    {canKick && (
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
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {!spotifyStatusQuery.data?.connected && (
          <Card className="border-[#1DB954]/40 bg-gradient-to-br from-[#1DB954]/10 via-[#1DB954]/5 to-transparent animate-fade-in overflow-visible">
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="h-20 w-20 rounded-full bg-[#1DB954]/20 flex items-center justify-center animate-spotify-pulse">
                    <SpotifyIcon size={40} />
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex items-end gap-1">
                    {[0, 0.2, 0.1, 0.3, 0.15].map((delay, i) => (
                      <div
                        key={i}
                        className="w-1 bg-[#1DB954] rounded-full animate-wave-bar"
                        style={{ 
                          animationDelay: `${delay}s`,
                          height: '8px'
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="font-bold text-xl">Spotify'ı Bağla</h3>
                  <p className="text-muted-foreground">
                    Oyuna katılmak için Spotify hesabını bağlamalısın
                  </p>
                </div>
                <Button
                  onClick={connectSpotify}
                  size="lg"
                  className="bg-[#1DB954] hover:bg-[#1ed760] text-black font-bold gap-2 px-8 animate-spotify-glow"
                  data-testid="button-connect-spotify"
                >
                  <SpotifyIcon size={20} />
                  Spotify ile Bağlan
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {spotifyStatusQuery.data?.connected && (
          <div className="space-y-4">
            <Card className="border-[#1DB954]/30 bg-gradient-to-r from-[#1DB954]/15 to-[#1DB954]/5 animate-fade-in">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-[#1DB954]/20 flex items-center justify-center">
                    <SpotifyIcon size={24} />
                  </div>
                  <div className="absolute -top-1 -right-1 h-4 w-4 bg-[#1DB954] rounded-full flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-[#1DB954]">Spotify Bağlı</p>
                  <p className="text-muted-foreground text-sm">
                    {hasSelectedDevice ? "Cihaz seçildi, oyuna hazırsın!" : "Şarkıların çalacağı cihazı seç"}
                  </p>
                </div>
                <div className="flex items-end gap-0.5">
                  {[0, 0.15, 0.05, 0.2, 0.1].map((delay, i) => (
                    <div
                      key={i}
                      className="w-0.5 bg-[#1DB954]/60 rounded-full animate-wave-bar"
                      style={{ 
                        animationDelay: `${delay}s`,
                        height: '6px'
                      }}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="animate-fade-in">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Speaker className="h-4 w-4" />
                    Cihaz Seç
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/spotify/devices", userId] })}
                    disabled={devicesQuery.isFetching}
                    data-testid="button-refresh-devices"
                  >
                    <RefreshCw className={`h-4 w-4 ${devicesQuery.isFetching ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                {devicesQuery.isLoading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : devicesQuery.data?.devices.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <p className="text-sm">Aktif cihaz bulunamadı</p>
                    <p className="text-xs mt-1">Spotify uygulamasını bir cihazda aç</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {devicesQuery.data?.devices.map((device) => {
                      const isSelected = devicesQuery.data?.selectedDeviceId === device.id;
                      return (
                        <button
                          key={device.id}
                          onClick={() => selectDeviceMutation.mutate(device.id)}
                          disabled={selectDeviceMutation.isPending}
                          className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
                            isSelected
                              ? "bg-[#1DB954]/20 ring-2 ring-[#1DB954]"
                              : "bg-muted/50 hover-elevate active-elevate-2"
                          }`}
                          data-testid={`button-device-${device.id}`}
                        >
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                            isSelected ? "bg-[#1DB954] text-black" : "bg-muted"
                          }`}>
                            {getDeviceIcon(device.type)}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{device.name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{device.type}</p>
                          </div>
                          {device.isActive && (
                            <Badge variant="secondary" className="text-xs">Aktif</Badge>
                          )}
                          {isSelected && (
                            <div className="h-5 w-5 rounded-full bg-[#1DB954] flex items-center justify-center">
                              <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-border">
          {isHost ? (
            <div className="space-y-2">
              <Button
                className="w-full"
                size="lg"
                onClick={() => startGameMutation.mutate()}
                disabled={!canStart || startGameMutation.isPending}
                data-testid="button-start-game"
              >
                {startGameMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Başlatılıyor...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    {canStart
                      ? "Oyunu Başlat"
                      : playerCount < 2
                        ? "Başlatmak için en az 2 oyuncu gerekli"
                        : `${disconnectedCount} oyuncu Spotify bağlamalı`}
                  </>
                )}
              </Button>
              {!allSpotifyConnected && playerCount >= 2 && (
                <p className="text-sm text-center text-muted-foreground">
                  Tüm oyuncuların Spotify hesabını bağlaması gerekiyor
                </p>
              )}
            </div>
          ) : (
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-muted-foreground">
                Host'un oyunu başlatmasını bekliyorsunuz...
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
