import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Crown, Loader2, Users, Play, UserX, Check, ArrowRight, Share2, User, Clock, Zap, Link2, MessageCircle } from "lucide-react";
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
  const [copiedLink, setCopiedLink] = useState(false);
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
      toast({ title: "Kod kopyalandı!" });
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }, [roomCode, toast]);

  const copyLink = useCallback(async () => {
    try {
      const url = `${window.location.origin}/oyun/${roomCode}`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      toast({ title: "Link kopyalandı!" });
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {}
  }, [roomCode, toast]);

  const shareWhatsApp = useCallback(() => {
    const url = `${window.location.origin}/oyun/${roomCode}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(`Kim Dinliyor? oyununa katıl!\n\nOda: ${roomCode}\n${url}`)}`, "_blank");
  }, [roomCode]);

  // Loading
  if (roomQuery.isLoading) {
    return (
      <div className="lobby-page">
        <div className="lobby-loading">
          <Loader2 className="lobby-loading-icon animate-spin" />
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

  // Dynamic empty slots based on maxPlayers
  const displaySlots = Math.min(maxPlayers, 12);
  const emptySlots = Math.max(0, displaySlots - playerCount);

  // Join Screen
  if (!isUserInRoom) {
    return (
      <div className="lobby-page">
        <header className="lobby-topbar">
          <Link href="/"><button className="lobby-back" data-testid="button-back"><ArrowLeft /></button></Link>
          <Logo height={32} />
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

            <div className="lobby-join-meta">
              <span><Clock className="icon-sm" />{room.totalRounds} Tur</span>
              <span><Zap className="icon-sm" />{room.roundDuration}sn</span>
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
                <span className="lobby-section-label">Bekleyen Oyuncular</span>
                <div className="lobby-join-chips">
                  {players.map((p) => (
                    <span key={p.id} className={`lobby-chip ${p.user.googleConnected ? 'ready' : ''}`}>
                      {p.userId === room.hostUserId && <Crown className="icon-xs" />}
                      {p.user.displayName}
                      {p.user.googleConnected && <Check className="icon-xs" />}
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
        <Logo height={32} />
        <div style={{ width: 32 }} />
      </header>

      {/* Main Card */}
      <main className="lobby-center">
        <div className="lobby-card-lg">
          {/* Room Header */}
          <div className="lobby-header">
            <div className="lobby-room-icon-lg">
              <SiYoutube />
            </div>
            <div className="lobby-room-details">
              <h1 className="lobby-room-title" data-testid="text-room-name">{room.name}</h1>
              <div className="lobby-room-badges">
                <span className="lobby-badge"><Clock className="icon-sm" />{room.totalRounds} Tur</span>
                <span className="lobby-badge"><Zap className="icon-sm" />{room.roundDuration}sn</span>
                <span className="lobby-badge"><Users className="icon-sm" />{playerCount}/{maxPlayers}</span>
              </div>
            </div>
            {isHost && <div className="lobby-host-tag"><Crown className="icon-sm" />Host</div>}
          </div>

          {/* Room Code & Share Section */}
          <div className="lobby-share-section">
            <div className="lobby-code-display">
              <span className="lobby-code-label">Oda Kodu</span>
              <div className="lobby-code-box">
                {roomCode?.split('').map((char, i) => (
                  <span key={i} className="lobby-code-char">{char}</span>
                ))}
              </div>
              <button onClick={copyCode} className="lobby-copy-btn" data-testid="button-copy-code">
                {copied ? <Check /> : <Copy />}
                {copied ? "Kopyalandı" : "Kopyala"}
              </button>
            </div>
            <div className="lobby-share-buttons">
              <button onClick={copyLink} className="lobby-share-btn" data-testid="button-copy-link">
                <Link2 />
                <span>{copiedLink ? "Kopyalandı!" : "Link Kopyala"}</span>
              </button>
              <button onClick={shareWhatsApp} className="lobby-share-btn whatsapp" data-testid="button-whatsapp">
                <SiWhatsapp />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Progress Dots */}
          <div className="lobby-progress-lg">
            <span className="lobby-progress-label">Turlar</span>
            <div className="lobby-dots-row">
              {[...Array(room.totalRounds)].map((_, i) => (
                <span key={i} className="lobby-dot-lg" />
              ))}
            </div>
          </div>

          {/* YouTube Connection Alert */}
          {hasGuessModes && !googleStatusQuery.data?.connected && (
            <div className="lobby-alert-lg">
              <div className="lobby-alert-icon-lg">
                <SiYoutube />
              </div>
              <div className="lobby-alert-content">
                <strong>YouTube Hesabını Bağla</strong>
                <span>Tahmin modları için YouTube hesabını bağlaman gerekiyor. Beğenilerin ve aboneliklerin oyuna eklenir.</span>
              </div>
              <Button onClick={connectGoogle} className="lobby-connect-btn-lg" data-testid="button-connect-google">
                <SiGoogle />
                Bağlan
              </Button>
            </div>
          )}

          {/* Connected Status */}
          {hasGuessModes && googleStatusQuery.data?.connected && (
            <div className="lobby-connected-lg">
              <Check className="icon-md" />
              <span>YouTube Bağlı - Oyuna hazırsın!</span>
            </div>
          )}

          {/* Players Section */}
          <div className="lobby-players-section-lg">
            <div className="lobby-section-header-lg">
              <div className="lobby-section-title">
                <Users className="icon-md" />
                <span>Oyuncular</span>
              </div>
              {hasGuessModes && (
                <div className="lobby-ready-status">
                  <span className={connectedCount === playerCount ? 'all-ready' : ''}>{connectedCount}/{playerCount} Hazır</span>
                </div>
              )}
            </div>

            <div className={`lobby-players-grid-lg cols-${Math.min(displaySlots, 4)}`}>
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className={`lobby-player-lg ${player.user.googleConnected || !hasGuessModes ? 'ready' : ''}`}
                  data-testid={`card-player-${player.userId}`}
                >
                  <div className="lobby-player-avatar-lg">
                    {player.user.avatarUrl ? (
                      <img src={player.user.avatarUrl} alt="" />
                    ) : (
                      <span className="lobby-player-initial">{player.user.displayName?.charAt(0).toUpperCase()}</span>
                    )}
                    {player.userId === room.hostUserId && (
                      <div className="lobby-crown-badge"><Crown /></div>
                    )}
                  </div>
                  <span className="lobby-player-name-lg">{player.user.displayName}</span>
                  <span className={`lobby-player-status-lg ${player.user.googleConnected || !hasGuessModes ? 'ready' : ''}`}>
                    {player.user.googleConnected || !hasGuessModes ? (
                      <><Check className="icon-xs" />Hazır</>
                    ) : (
                      "Bekliyor"
                    )}
                  </span>
                  {isHost && player.userId !== userId && (
                    <button 
                      onClick={() => kickPlayerMutation.mutate(player.userId)}
                      className="lobby-kick-lg"
                      data-testid={`button-kick-${player.userId}`}
                    >
                      <UserX />
                    </button>
                  )}
                </div>
              ))}
              
              {/* Empty Slots */}
              {[...Array(emptySlots)].map((_, i) => (
                <div key={`empty-${i}`} className="lobby-player-lg empty">
                  <div className="lobby-player-avatar-lg empty">
                    <User className="lobby-empty-icon" />
                  </div>
                  <span className="lobby-player-name-lg empty">Boş slot</span>
                </div>
              ))}
            </div>
          </div>

          {/* Host Controls */}
          <div className="lobby-controls-lg">
            <div className="lobby-controls-left">
              <div className="lobby-controls-icon-lg">
                <Play />
              </div>
              <div className="lobby-controls-text">
                <strong>{isHost ? "Host Kontrolü" : "Bekleniyor"}</strong>
                <span>
                  {!canStart && playerCount < 2 && "En az 2 oyuncu gerekli"}
                  {!canStart && playerCount >= 2 && !allConnected && hasGuessModes && "Tüm oyuncular YouTube bağlamalı"}
                  {canStart && "Herkes hazır! Oyunu başlatabilirsin."}
                  {!isHost && "Host oyunu başlatınca oyun başlayacak..."}
                </span>
              </div>
            </div>
            {isHost && (
              <Button
                onClick={() => startGameMutation.mutate()}
                disabled={!canStart || startGameMutation.isPending}
                size="lg"
                className="lobby-start-btn-lg"
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
