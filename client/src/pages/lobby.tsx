import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Share2, Crown, Loader2, Users, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotifyIcon } from "@/components/spotify-icon";
import { PlayerCard } from "@/components/player-card";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { RoomWithPlayers } from "@shared/schema";

export default function Lobby() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomCode = params.code?.toUpperCase();
  const userId = localStorage.getItem("userId");

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

  useEffect(() => {
    if (roomQuery.data?.status === "playing") {
      setLocation(`/oyun/${roomCode}/game`);
    }
  }, [roomQuery.data?.status, roomCode, setLocation]);

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
        <header className="flex items-center justify-between p-4 border-b border-border">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <ThemeToggle />
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
  const canStart = isHost && playerCount >= 2;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <SpotifyIcon size={24} />
            <span className="font-semibold truncate max-w-[150px] md:max-w-none">
              {room.name}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="font-mono">
            {roomCode}
          </Badge>
          <ThemeToggle />
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
              players.map((player, index) => (
                <div
                  key={player.id}
                  className={`animate-slide-up stagger-${Math.min(index + 1, 5)}`}
                  style={{ animationFillMode: "backwards" }}
                >
                  <PlayerCard
                    player={{
                      id: player.user.id,
                      displayName: player.user.displayName,
                      uniqueName: player.user.uniqueName,
                      spotifyConnected: player.user.spotifyConnected || false,
                      totalScore: player.totalScore || 0,
                    }}
                    isHost={player.userId === room.hostUserId}
                    showScore={false}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-border">
          {isHost ? (
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
                    : `Başlatmak için en az 2 oyuncu gerekli`}
                </>
              )}
            </Button>
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
