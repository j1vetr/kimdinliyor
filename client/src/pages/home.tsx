import { Link } from "wouter";
import { Users, Plus, Music2, Music, Headphones, Disc3, ArrowRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SpotifyIcon } from "@/components/spotify-icon";
import { Logo } from "@/components/logo";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

function FloatingIcons() {
  const icons = useMemo(() => {
    const iconTypes = [Music, Music2, Headphones, Disc3, "spotify"];
    return Array.from({ length: 10 }, (_, i) => ({
      id: i,
      type: iconTypes[i % iconTypes.length],
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 20,
      size: 16 + Math.random() * 24,
      opacity: 0.01 + Math.random() * 0.015,
    }));
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {icons.map((icon) => (
        <div
          key={icon.id}
          className="absolute animate-float-up"
          style={{
            left: `${icon.left}%`,
            bottom: "-50px",
            animationDelay: `${icon.delay}s`,
            animationDuration: `${icon.duration}s`,
            opacity: icon.opacity,
          }}
        >
          {icon.type === "spotify" ? (
            <SpotifyIcon size={icon.size} />
          ) : (
            <icon.type
              size={icon.size}
              className="text-[#1DB954]"
            />
          )}
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [, setLocation] = useLocation();

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      setLocation(`/oyun/${roomCode.trim().toUpperCase()}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && roomCode.trim()) {
      handleJoinRoom();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      <FloatingIcons />
      <header className="flex items-center justify-center p-4 border-b border-border relative z-10">
        <Logo height={72} />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8 relative z-10">
        <div className="max-w-lg w-full space-y-10">
          <div className="text-center space-y-4 animate-fade-in">
            <div className="flex items-center justify-center gap-3 mb-6">
              <div className="relative">
                <SpotifyIcon size={56} />
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full animate-ping" />
              </div>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Kim <span className="text-primary">Dinliyor?</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-sm mx-auto leading-relaxed">
              Spotify hesabını bağla, arkadaşlarınla oyna ve kimin hangi şarkıyı dinlediğini tahmin et!
            </p>
          </div>

          <div className="grid gap-6">
            <Link href="/oda-olustur">
              <Card 
                className="hover-elevate active-elevate-2 cursor-pointer group overflow-visible border-2 border-transparent hover:border-primary/30 transition-all duration-300"
                style={{ animationDelay: "0.1s" }}
              >
                <CardContent className="p-6">
                  <div className="flex items-center gap-5">
                    <div className="relative">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                        <Plus className="h-8 w-8 text-primary" />
                      </div>
                      <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-bold mb-1 group-hover:text-primary transition-colors">
                        Yeni Oda Oluştur
                      </h2>
                      <p className="text-muted-foreground text-sm leading-relaxed">
                        Kendi oyun odanı aç, arkadaşlarına oda kodunu gönder ve birlikte eğlenmeye başla.
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card 
              className="overflow-visible border-2 border-transparent"
              style={{ animationDelay: "0.2s" }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-5 mb-5">
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center">
                    <Users className="h-8 w-8 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold mb-1">Odaya Katıl</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Arkadaşından aldığın oda kodunu gir ve oyuna hemen katıl.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="Oda kodunu gir"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      onKeyDown={handleKeyDown}
                      maxLength={7}
                      className="uppercase text-center font-mono text-lg tracking-widest h-12 pr-12"
                      data-testid="input-room-code"
                    />
                    {roomCode && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {roomCode.length}/7
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleJoinRoom}
                    disabled={!roomCode.trim()}
                    size="lg"
                    className="h-12 px-6"
                    data-testid="button-join-room"
                  >
                    Katıl
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="text-center space-y-3 animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="h-px w-12 bg-border" />
              <span>Nasıl Oynanır?</span>
              <div className="h-px w-12 bg-border" />
            </div>
            <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">1</div>
                <span>Spotify Bağla</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">2</div>
                <span>Odaya Katıl</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">3</div>
                <span>Şarkıyı Tahmin Et</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="p-4 border-t border-border relative z-10">
        <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>Geliştirici:</span>
            <a
              href="https://toov.com.tr"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-foreground hover:text-primary transition-colors"
              data-testid="link-developer"
            >
              TOOV
            </a>
            <span className="text-primary">&lt;3</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Powered by</span>
            <a
              href="https://spotify.com"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              data-testid="link-spotify"
            >
              <SpotifyIcon size={20} />
              <span className="font-semibold text-[#1DB954]">Spotify</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
