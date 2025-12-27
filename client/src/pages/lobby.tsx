import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Copy, Crown, Loader2, Users, Play, UserX, Check, ArrowRight, Radio, LogOut } from "lucide-react";
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
      <div className="deck-shell">
        <div className="deck-loading">
          <div className="deck-spinner" />
          <span>Yükleniyor...</span>
        </div>
      </div>
    );
  }

  // Error
  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="deck-shell">
        <div className="deck-error">
          <Radio className="deck-error-icon" />
          <h2>Oda Bulunamadı</h2>
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

  // Join Screen
  if (!isUserInRoom) {
    return (
      <div className="deck-shell">
        <header className="deck-top-bar">
          <Logo height={24} />
        </header>
        
        <main className="deck-join-area">
          <div className="deck-join-box">
            <div className="deck-join-indicator">
              <span className="deck-pulse" />
              <span>Aktif Lobi</span>
            </div>
            
            <h1 className="deck-join-title">{room.name}</h1>
            
            <div className="deck-code-unit">
              <label className="deck-code-label">Oda Kodu</label>
              <div className="deck-code-leds">
                {roomCode?.split("").map((c, i) => (
                  <div key={i} className="deck-led">{c}</div>
                ))}
              </div>
              <div className="deck-code-info">
                <Users className="deck-info-icon" />
                <span>{playerCount}/{maxPlayers}</span>
              </div>
            </div>

            {!isFull ? (
              <div className="deck-join-form">
                <Input
                  placeholder="Adın"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  maxLength={20}
                  className="deck-join-input"
                  data-testid="input-join-name"
                  onKeyDown={(e) => e.key === "Enter" && handleQuickJoin()}
                />
                <Button onClick={handleQuickJoin} disabled={!joinName.trim() || isJoining} className="deck-join-btn" data-testid="button-quick-join">
                  {isJoining ? <Loader2 className="animate-spin" /> : <ArrowRight />}
                  Katıl
                </Button>
              </div>
            ) : (
              <div className="deck-full">Lobi dolu</div>
            )}

            {players.length > 0 && (
              <div className="deck-join-roster">
                <span className="deck-roster-label">Oyuncular</span>
                <div className="deck-roster-chips">
                  {players.map((p) => (
                    <span key={p.id} className={`deck-chip ${p.user.googleConnected ? 'on' : ''}`}>
                      {p.userId === room.hostUserId && <Crown className="deck-chip-icon" />}
                      {p.user.displayName}
                      {p.user.googleConnected && <Check className="deck-chip-check" />}
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

  // Main Lobby - DJ Deck Style
  return (
    <div className="deck-shell">
      {/* Top Bar */}
      <header className="deck-top-bar">
        <Link href="/">
          <button className="deck-back" data-testid="button-back"><ArrowLeft /></button>
        </Link>
        <Logo height={20} />
        <div className="deck-meter">
          <Users className="deck-meter-icon" />
          <span>{playerCount}/{maxPlayers}</span>
        </div>
      </header>

      {/* Console Body */}
      <main className="deck-console">
        {/* Left Channel - Code + Share */}
        <section className="deck-channel">
          <div className="deck-channel-header">
            <span className="deck-ch-label">Kanal A</span>
            <span className="deck-ch-led on" />
          </div>
          
          <div className="deck-code-block">
            <label className="deck-block-label">Oda Kodu</label>
            <div className="deck-code-display" data-testid="display-room-code">
              {roomCode?.split("").map((c, i) => (
                <div key={i} className="deck-digit">{c}</div>
              ))}
            </div>
          </div>

          <div className="deck-share-buttons">
            <button onClick={copyCode} className="deck-share-btn" data-testid="button-copy-code">
              {copied ? <Check /> : <Copy />}
              <span>{copied ? "OK" : "Kopyala"}</span>
            </button>
            <button onClick={shareWhatsApp} className="deck-share-btn whatsapp" data-testid="button-whatsapp">
              <SiWhatsapp />
            </button>
          </div>
        </section>

        {/* Center - Room Info + Players */}
        <section className="deck-mixer">
          <div className="deck-room-strip">
            <h1 className="deck-room-name" data-testid="text-room-name">{room.name}</h1>
            <div className="deck-room-knobs">
              <div className="deck-knob">
                <span className="deck-knob-value">{room.totalRounds}</span>
                <span className="deck-knob-label">Tur</span>
              </div>
              <div className="deck-knob">
                <span className="deck-knob-value">{room.roundDuration}</span>
                <span className="deck-knob-label">Saniye</span>
              </div>
            </div>
          </div>

          {/* YouTube Connection */}
          {hasGuessModes && (
            <div className="deck-yt-strip">
              {!googleStatusQuery.data?.connected ? (
                <button onClick={connectGoogle} className="deck-yt-connect" data-testid="button-connect-google">
                  <SiYoutube className="deck-yt-icon" />
                  <span>YouTube Bağla</span>
                  <SiGoogle className="deck-google-icon" />
                </button>
              ) : (
                <div className="deck-yt-ok">
                  <Check className="deck-yt-check" />
                  <span>YouTube Bağlı</span>
                  <div className="deck-signal">
                    <span /><span /><span />
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasGuessModes && (
            <div className="deck-mode-strip">
              <Radio className="deck-mode-icon" />
              <span>Karşılaştırma Modu</span>
            </div>
          )}

          {/* Players Faders */}
          <div className="deck-faders">
            <div className="deck-faders-header">
              <span>Oyuncular</span>
              {hasGuessModes && <span className="deck-faders-count">{connectedCount}/{playerCount}</span>}
            </div>
            <div className="deck-fader-list">
              {players.map((player) => (
                <div 
                  key={player.id} 
                  className={`deck-fader ${player.user.googleConnected || !hasGuessModes ? 'ready' : ''}`}
                  data-testid={`card-player-${player.userId}`}
                >
                  <div className="deck-fader-avatar">
                    {player.user.avatarUrl ? (
                      <img src={player.user.avatarUrl} alt="" />
                    ) : (
                      player.user.displayName.charAt(0)
                    )}
                    {player.userId === room.hostUserId && (
                      <Crown className="deck-fader-crown" />
                    )}
                  </div>
                  <span className="deck-fader-name">{player.user.displayName}</span>
                  <div className="deck-fader-meter">
                    <span className={player.user.googleConnected || !hasGuessModes ? 'on' : ''} />
                    <span className={player.user.googleConnected || !hasGuessModes ? 'on' : ''} />
                    <span className={player.user.googleConnected || !hasGuessModes ? 'on' : ''} />
                  </div>
                  {isHost && player.userId !== userId && (
                    <button 
                      onClick={() => kickPlayerMutation.mutate(player.userId)}
                      className="deck-fader-kick"
                      data-testid={`button-kick-${player.userId}`}
                    >
                      <UserX />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* Transport Bar */}
      <footer className="deck-transport">
        {isHost ? (
          <>
            <span className="deck-transport-status">
              {!canStart && playerCount < 2 && "2+ oyuncu gerekli"}
              {!canStart && playerCount >= 2 && !allConnected && hasGuessModes && "Tüm oyuncular YouTube bağlamalı"}
              {canStart && <span className="ready">Hazır!</span>}
            </span>
            <Button
              onClick={() => startGameMutation.mutate()}
              disabled={!canStart || startGameMutation.isPending}
              className="deck-play-btn"
              data-testid="button-start-game"
            >
              {startGameMutation.isPending ? <Loader2 className="animate-spin" /> : <Play />}
              Başlat
            </Button>
          </>
        ) : (
          <div className="deck-transport-wait">
            <Loader2 className="animate-spin" />
            <span>Host bekleniyor...</span>
          </div>
        )}
      </footer>
    </div>
  );
}
