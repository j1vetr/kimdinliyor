import { Link } from "wouter";
import { Users, Plus, Music2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import { SpotifyIcon } from "@/components/spotify-icon";
import { useState } from "react";
import { useLocation } from "wouter";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [, setLocation] = useLocation();

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      setLocation(`/oyun/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <SpotifyIcon size={28} />
          <span className="font-semibold text-lg">Oda Oyunu</span>
        </div>
        <ThemeToggle />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-8">
        <div className="max-w-md w-full space-y-8 animate-fade-in">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-3">
              <SpotifyIcon size={48} />
              <Music2 className="h-10 w-10 text-primary animate-pulse-ring" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
              Spotify <span className="text-primary">Oda Oyunu</span>
            </h1>
            <p className="text-muted-foreground text-lg">
              Arkadaşlarınla müzik bilgini test et! Kim hangi şarkıyı dinliyor?
            </p>
          </div>

          <div className="grid gap-4">
            <Link href="/oda-olustur">
              <Card className="hover-elevate cursor-pointer transition-transform duration-200 group">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="h-14 w-14 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Plus className="h-7 w-7 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-semibold">Oda Oluştur</h2>
                    <p className="text-muted-foreground text-sm">
                      Yeni bir oyun odası oluştur ve arkadaşlarını davet et
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Card className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-14 w-14 rounded-lg bg-secondary flex items-center justify-center">
                  <Users className="h-7 w-7 text-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold">Odaya Katıl</h2>
                  <p className="text-muted-foreground text-sm">
                    Oda kodunu girerek mevcut bir oyuna katıl
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Oda kodu (örn: O123456)"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={7}
                  className="uppercase text-center font-mono text-lg tracking-widest"
                  data-testid="input-room-code"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!roomCode.trim()}
                  data-testid="button-join-room"
                >
                  Katıl
                </Button>
              </div>
            </Card>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            <p>Spotify hesabını bağla ve arkadaşlarınla eğlen!</p>
          </div>
        </div>
      </main>

      <footer className="p-4 border-t border-border text-center text-sm text-muted-foreground">
        <p>Spotify Oda Oyunu - Multiplayer Müzik Oyunu</p>
      </footer>
    </div>
  );
}
