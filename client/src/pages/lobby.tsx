import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Share2, Crown, Loader2, Users, Play, UserX, Check, ArrowRight, Tv, LogOut, Radio } from "lucide-react";
import { SiYoutube, SiGoogle, SiWhatsapp } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
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
        toast({ title: "Link Kopyalandı" });
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast({ title: "Link Kopyalandı" });
    }
  }, [roomCode, roomQuery.data?.name, toast]);

  const shareWhatsApp = useCallback(() => {
    const shareUrl = `${window.location.origin}/oyun/${roomCode}`;
    const text = `Kim Dinliyor? oyununa katıl! Oda: ${roomCode} - ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  }, [roomCode]);

  // Loading state
  if (roomQuery.isLoading) {
    return (
      <div className="lobby-shell">
        <div className="lobby-loading">
          <div className="lobby-spinner" />
          <span>Yükleniyor...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="lobby-shell">
        <div className="lobby-error">
          <div className="lobby-error-icon">
            <Tv />
          </div>
          <h2>Oda Bulunamadı</h2>
          <p>Bu oda artık mevcut değil.</p>
          <Link href="/">
            <Button size="sm">
              <ArrowLeft />
              Ana Sayfa
            </Button>
          </Link>
        </div>
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

  // Join screen
  if (!isUserInRoom) {
    return (
      <div className="lobby-shell">
        <header className="lobby-header">
          <Logo height={28} />
        </header>
        
        <main className="lobby-join-main">
          <div className="lobby-join-card">
            <div className="lobby-join-status">
              <div className="lobby-status-dot" />
              <span>Aktif Lobi</span>
            </div>
            
            <h1 className="lobby-join-title">{room.name}</h1>
            
            <div className="lobby-code-panel">
              <div className="lobby-code-label">Oda Kodu</div>
              <div className="lobby-code-display">
                {roomCode?.split("").map((char, i) => (
                  <div key={i} className="lobby-led-digit">{char}</div>
                ))}
              </div>
              <div className="lobby-code-meta">
                <Users className="lobby-meta-icon" />
                <span>{playerCount}/{maxPlayers}</span>
              </div>
            </div>

            {!isFull ? (
              <div className="lobby-join-form">
                <Input
                  placeholder="Adın"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={20}
                  className="lobby-join-input"
                  data-testid="input-join-name"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                />
                <Button
                  onClick={handleQuickJoin}
                  disabled={!joinName.trim() || isJoining}
                  className="lobby-join-btn"
                  data-testid="button-quick-join"
                >
                  {isJoining ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                  {isJoining ? "Katılınıyor" : "Katıl"}
                </Button>
              </div>
            ) : (
              <div className="lobby-full-msg">Lobi dolu</div>
            )}

            {players.length > 0 && (
              <div className="lobby-join-players">
                <span className="lobby-join-players-label">Oyuncular</span>
                <div className="lobby-join-players-list">
                  {players.map((p) => (
                    <div key={p.id} className={`lobby-player-chip ${p.user.googleConnected ? 'connected' : ''}`}>
                      {p.userId === room.hostUserId && <Crown className="lobby-chip-crown" />}
                      <span>{p.user.displayName}</span>
                      {p.user.googleConnected && <Check className="lobby-chip-check" />}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Main lobby
  return (
    <div className="lobby-shell">
      {/* Header */}
      <header className="lobby-header">
        <Link href="/">
          <Button variant="ghost" size="icon" className="lobby-back-btn" data-testid="button-back">
            <ArrowLeft />
          </Button>
        </Link>
        <Logo height={24} />
        <div className="lobby-player-count">
          <Users />
          <span>{playerCount}/{maxPlayers}</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="lobby-main">
        {/* Room Info Panel */}
        <section className="lobby-room-panel">
          <div className="lobby-room-info">
            <h1 className="lobby-room-name" data-testid="text-room-name">{room.name}</h1>
            <div className="lobby-room-meta">
              <span>{room.totalRounds} tur</span>
              <span className="lobby-meta-sep">|</span>
              <span>{room.roundDuration} sn</span>
            </div>
          </div>
          
          <div className="lobby-code-section">
            <div className="lobby-code-tag">Oda Kodu</div>
            <div className="lobby-code-box" data-testid="display-room-code">
              {roomCode?.split("").map((char, i) => (
                <div key={i} className="lobby-led-char">{char}</div>
              ))}
            </div>
          </div>

          <div className="lobby-share-row">
            <button onClick={copyRoomCode} className="lobby-share-btn" data-testid="button-copy-code">
              {copied ? <Check className="text-emerald-400" /> : <Copy />}
              <span>{copied ? "Kopyalandı" : "Kopyala"}</span>
            </button>
            <button onClick={shareRoom} className="lobby-share-btn" data-testid="button-share">
              <Share2 />
              <span>Paylaş</span>
            </button>
            <button onClick={shareWhatsApp} className="lobby-share-btn whatsapp" data-testid="button-whatsapp">
              <SiWhatsapp />
            </button>
          </div>
        </section>

        {/* YouTube Connection */}
        {hasGuessModes && (
          <section className="lobby-youtube-section">
            {!googleStatusQuery.data?.connected ? (
              <div className="lobby-youtube-warn">
                <div className="lobby-youtube-icon warn">
                  <SiYoutube />
                </div>
                <div className="lobby-youtube-text">
                  <strong>YouTube Bağla</strong>
                  <span>Tahmin modları için gerekli</span>
                </div>
                <Button size="sm" onClick={connectGoogle} className="lobby-google-btn" data-testid="button-connect-google">
                  <SiGoogle />
                  Bağlan
                </Button>
              </div>
            ) : (
              <div className="lobby-youtube-ok">
                <div className="lobby-youtube-icon ok">
                  <Check />
                </div>
                <span>YouTube Bağlı</span>
                <div className="lobby-signal-bars">
                  <div className="bar" />
                  <div className="bar" />
                  <div className="bar" />
                </div>
              </div>
            )}
          </section>
        )}

        {!hasGuessModes && (
          <section className="lobby-mode-info">
            <Radio className="lobby-mode-icon" />
            <span>Karşılaştırma Modu - Giriş gerekmez</span>
          </section>
        )}

        {/* Players */}
        <section className="lobby-players-section">
          <div className="lobby-players-header">
            <span>Oyuncular</span>
            {hasGuessModes && (
              <span className="lobby-connected-count">{connectedCount}/{playerCount} bağlı</span>
            )}
          </div>
          
          <div className="lobby-players-grid">
            {players.map((player) => (
              <div 
                key={player.id} 
                className={`lobby-player-card ${player.user.googleConnected || !hasGuessModes ? 'ready' : ''}`}
                data-testid={`card-player-${player.userId}`}
              >
                <div className="lobby-player-avatar">
                  {player.user.avatarUrl ? (
                    <img src={player.user.avatarUrl} alt="" />
                  ) : (
                    <span>{player.user.displayName.charAt(0)}</span>
                  )}
                  {player.userId === room.hostUserId && (
                    <div className="lobby-host-badge">
                      <Crown />
                    </div>
                  )}
                </div>
                
                <div className="lobby-player-info">
                  <span className="lobby-player-name">{player.user.displayName}</span>
                  {hasGuessModes && (
                    <span className={`lobby-player-status ${player.user.googleConnected ? 'ok' : 'wait'}`}>
                      {player.user.googleConnected ? 'Hazır' : 'Bekliyor'}
                    </span>
                  )}
                </div>

                {isHost && player.userId !== userId && (
                  <button 
                    onClick={() => kickPlayerMutation.mutate(player.userId)}
                    className="lobby-kick-btn"
                    data-testid={`button-kick-${player.userId}`}
                  >
                    <UserX />
                  </button>
                )}
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Transport Bar */}
      <footer className="lobby-transport">
        {isHost ? (
          <>
            <div className="lobby-transport-info">
              {!canStart && playerCount < 2 && <span>En az 2 oyuncu gerekli</span>}
              {!canStart && playerCount >= 2 && !allGoogleConnected && hasGuessModes && (
                <span>Herkes YouTube bağlamalı</span>
              )}
              {canStart && <span className="ready">Başlamaya hazır!</span>}
            </div>
            <Button
              onClick={() => startGameMutation.mutate()}
              disabled={!canStart || startGameMutation.isPending}
              className="lobby-start-btn"
              data-testid="button-start-game"
            >
              {startGameMutation.isPending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Play />
              )}
              <span>Oyunu Başlat</span>
            </Button>
          </>
        ) : (
          <div className="lobby-transport-wait">
            <Loader2 className="animate-spin" />
            <span>Host oyunu başlatmayı bekliyor...</span>
          </div>
        )}
      </footer>
    </div>
  );
}
