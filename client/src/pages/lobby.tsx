import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Crown, Loader2, Users, Play, UserX, Check, ArrowRight, Share2, User } from "lucide-react";
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/rooms", roomCode] });
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
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [roomCode]);

  const shareWhatsApp = useCallback(() => {
    const url = `${window.location.origin}/oyun/${roomCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Kim Dinliyor? - Oda: ${roomCode} - ${url}`)}`, "_blank");
  }, [roomCode]);

  // Loading
  if (roomQuery.isLoading) {
    return (
      <div className="lobby-page">
        <div className="lobby-loading">
          <Loader2 className="lobby-loading-icon" />
          <span>Yükleniyor...</span>
        </div>
      </div>
    );
  }

  // Error
  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="lobby-page">
        <div className="lobby-error">
          <h2>Oda Bulunamadı</h2>
          <p>Bu kod ile bir oda yok veya süre dolmuş olabilir.</p>
          <Link href="/"><Button size="sm"><ArrowLeft />Ana Sayfa</Button></Link>
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
  const roomGameModes = room.gameModes || ["who_liked"];
  const hasGuessModes = roomGameModes.some(mode => guessModes.includes(mode));
  const allConnected = hasGuessModes ? players.every(p => p.user.googleConnected) : true;
  const connectedCount = players.filter(p => p.user.googleConnected).length;
  const canStart = isHost && playerCount >= 2 && allConnected;
  const isUserInRoom = userId && players.some(p => p.userId === userId);
  const isFull = playerCount >= maxPlayers;

  // Empty slots calculation
  const emptySlots = Math.max(0, 6 - playerCount);

  // Join Screen
  if (!isUserInRoom) {
    return (
      <div className="lobby-page">
        <header className="lobby-topbar">
          <Link href="/"><button className="lobby-back" data-testid="button-back"><ArrowLeft /></button></Link>
          <Logo height={28} />
          <div style={{ width: 32 }} />
        </header>
        
        <main className="lobby-center">
          <div className="lobby-join-card">
            <div className="lobby-join-status">
              <span className="lobby-pulse" />
              <span>Aktif Lobi</span>
            </div>
            
            <h1 className="lobby-join-title">{room.name}</h1>
            
            <div className="lobby-join-code">
              <span className="lobby-join-code-label">Oda Kodu</span>
              <span className="lobby-join-code-value">{roomCode}</span>
              <span className="lobby-join-code-count"><Users className="icon-sm" />{playerCount}/{maxPlayers}</span>
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
                <Button onClick={handleQuickJoin} disabled={!joinName.trim() || isJoining} data-testid="button-quick-join">
                  {isJoining ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                  Katıl
                </Button>
              </div>
            ) : (
              <div className="lobby-full-msg">Lobi dolu</div>
            )}

            {players.length > 0 && (
              <div className="lobby-join-players">
                <span className="lobby-section-label">Oyuncular</span>
                <div className="lobby-join-chips">
                  {players.map((p) => (
                    <span key={p.id} className={`lobby-chip ${p.user.googleConnected ? 'ready' : ''}`}>
                      {p.userId === room.hostUserId && <Crown className="icon-xs" />}
                      {p.user.displayName}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // Main Lobby
  return (
    <div className="lobby-page">
      {/* Top Bar */}
      <header className="lobby-topbar">
        <Link href="/"><button className="lobby-back" data-testid="button-back"><ArrowLeft /></button></Link>
        <Logo height={28} />
        <div className="lobby-topbar-actions">
          <button onClick={copyCode} className="lobby-action-btn" data-testid="button-copy-code">
            {copied ? <Check /> : <Copy />}
          </button>
          <button onClick={shareWhatsApp} className="lobby-action-btn whatsapp" data-testid="button-whatsapp">
            <Share2 />
          </button>
        </div>
      </header>

      {/* Main Card */}
      <main className="lobby-center">
        <div className="lobby-card">
          {/* Room Info Bar */}
          <div className="lobby-room-bar">
            <div className="lobby-room-icon">
              <SiYoutube />
            </div>
            <div className="lobby-room-info">
              <span className="lobby-room-name" data-testid="text-room-name">{room.name}</span>
              <span className="lobby-room-meta">{roomCode} | {room.totalRounds} tur | {room.roundDuration}sn</span>
            </div>
            <div className="lobby-room-count">
              <Users className="icon-sm" />
              <span>{playerCount}/{maxPlayers}</span>
            </div>
          </div>

          {/* Progress Dots */}
          <div className="lobby-progress">
            {[...Array(room.totalRounds)].map((_, i) => (
              <span key={i} className="lobby-dot" />
            ))}
          </div>

          {/* YouTube Connection Alert */}
          {hasGuessModes && !googleStatusQuery.data?.connected && (
            <div className="lobby-alert">
              <div className="lobby-alert-icon">
                <SiYoutube />
              </div>
              <div className="lobby-alert-text">
                <strong>YouTube Bağla</strong>
                <span>Oyun için gerekli</span>
              </div>
              <Button onClick={connectGoogle} variant="outline" size="sm" className="lobby-connect-btn" data-testid="button-connect-google">
                <SiGoogle />
                Bağlan
              </Button>
            </div>
          )}

          {/* Connected Status */}
          {hasGuessModes && googleStatusQuery.data?.connected && (
            <div className="lobby-connected">
              <Check className="icon-sm" />
              <span>YouTube Bağlı</span>
            </div>
          )}

          {/* Players Section */}
          <div className="lobby-players-section">
            <div className="lobby-section-header">
              <span className="lobby-section-label">OYUNCULAR</span>
              {hasGuessModes && <span className="lobby-ready-count">{connectedCount}/{playerCount} hazır</span>}
            </div>

            <div className="lobby-players-grid">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className={`lobby-player ${player.user.googleConnected || !hasGuessModes ? 'ready' : ''}`}
                  data-testid={`card-player-${player.userId}`}
                >
                  <div className="lobby-player-avatar">
                    {player.user.avatarUrl ? (
                      <img src={player.user.avatarUrl} alt="" />
                    ) : (
                      <User className="lobby-player-icon" />
                    )}
                    {player.userId === room.hostUserId && (
                      <div className="lobby-host-badge"><Crown /></div>
                    )}
                  </div>
                  <span className="lobby-player-name">{player.user.displayName}</span>
                  <span className="lobby-player-status">
                    {player.user.googleConnected || !hasGuessModes ? "Hazır" : "Bekliyor"}
                  </span>
                  {isHost && player.userId !== userId && (
                    <button 
                      onClick={() => kickPlayerMutation.mutate(player.userId)}
                      className="lobby-kick"
                      data-testid={`button-kick-${player.userId}`}
                    >
                      <UserX />
                    </button>
                  )}
                </div>
              ))}
              
              {/* Empty Slots */}
              {[...Array(emptySlots)].map((_, i) => (
                <div key={`empty-${i}`} className="lobby-player empty">
                  <div className="lobby-player-avatar empty">
                    <User className="lobby-player-icon" />
                  </div>
                  <span className="lobby-player-name">Boş slot</span>
                </div>
              ))}
            </div>
          </div>

          {/* Host Controls */}
          <div className="lobby-controls">
            <div className="lobby-controls-icon">
              <Play />
            </div>
            <div className="lobby-controls-info">
              <strong>Host Kontrolü</strong>
              <span>
                {!canStart && playerCount < 2 && "En az 2 oyuncu gerekli"}
                {!canStart && playerCount >= 2 && !allConnected && hasGuessModes && "Tüm oyuncular YouTube bağlamalı"}
                {canStart && "Oyunu başlatabilirsin!"}
                {!isHost && "Host bekleniyor..."}
              </span>
            </div>
            {isHost && (
              <Button
                onClick={() => startGameMutation.mutate()}
                disabled={!canStart || startGameMutation.isPending}
                className="lobby-start-btn"
                data-testid="button-start-game"
              >
                {startGameMutation.isPending ? <Loader2 className="animate-spin" /> : <Play />}
                Başlat
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
