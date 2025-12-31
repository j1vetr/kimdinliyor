import { Link } from "wouter";
import { Users, Plus, ArrowRight, ThumbsUp, UserPlus, Eye, Clock, Heart, Timer, Disc3, ChevronRight, Zap, Trophy, Play, Sparkles } from "lucide-react";
import { SiYoutube, SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { animate, stagger } from "animejs";

const GAME_MODES = [
  { id: "who_liked", title: "Kim Beğenmiş?", icon: ThumbsUp, color: "from-red-500 to-rose-600" },
  { id: "who_subscribed", title: "Kim Abone?", icon: UserPlus, color: "from-orange-500 to-amber-600" },
  { id: "oldest_like", title: "İlk Aşkım", icon: Heart, color: "from-pink-500 to-rose-600" },
  { id: "which_older", title: "Eski?", icon: Clock, color: "from-blue-500 to-cyan-600" },
  { id: "most_viewed", title: "İzlenen", icon: Eye, color: "from-emerald-500 to-green-600" },
  { id: "which_longer", title: "Uzun?", icon: Timer, color: "from-purple-500 to-violet-600" },
  { id: "which_more_subs", title: "Popüler?", icon: Users, color: "from-cyan-500 to-blue-600" },
  { id: "which_more_videos", title: "Emektar?", icon: Disc3, color: "from-amber-500 to-orange-600" },
];

const DEMO_PLAYERS = [
  { name: "Beren", avatar: "B", score: 45 },
  { name: "Mert", avatar: "M", score: 38 },
  { name: "Selin", avatar: "S", score: 32 },
  { name: "Can", avatar: "C", score: 28 },
];

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [, setLocation] = useLocation();
  const heroRef = useRef<HTMLDivElement>(null);
  const modesRef = useRef<HTMLDivElement>(null);
  const demoRef = useRef<HTMLDivElement>(null);
  const [activeDemo, setActiveDemo] = useState(0);

  // Hero animation with anime.js
  useEffect(() => {
    if (heroRef.current) {
      // Floating orbs animation
      animate('.hero-orb', {
        translateY: [-20, 20],
        translateX: [-10, 10],
        scale: [1, 1.1, 1],
        opacity: [0.5, 0.8, 0.5],
        duration: 4000,
        ease: 'inOutSine',
        loop: true,
        alternate: true,
        delay: stagger(500),
      });

      // Title entrance
      animate('.hero-title-char', {
        opacity: [0, 1],
        translateY: [30, 0],
        duration: 800,
        ease: 'outExpo',
        delay: stagger(40),
      });

      // Stats counter - simple fade in
      animate('.stat-number', {
        opacity: [0, 1],
        translateY: [20, 0],
        duration: 1000,
        ease: 'outExpo',
        delay: stagger(150, { start: 400 }),
      });
    }
  }, []);

  // Mode cards hover animation  
  useEffect(() => {
    const cards = document.querySelectorAll('.mode-card-anim');
    cards.forEach((card) => {
      card.addEventListener('mouseenter', () => {
        animate(card, {
          scale: 1.05,
          duration: 200,
          ease: 'outCubic',
        });
      });
      card.addEventListener('mouseleave', () => {
        animate(card, {
          scale: 1,
          duration: 200,
          ease: 'outCubic',
        });
      });
    });
  }, []);

  // Demo rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveDemo((prev) => (prev + 1) % 3);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      setLocation(`/oyun/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="hero-orb absolute top-[10%] left-[15%] w-72 h-72 bg-primary/15 rounded-full blur-[100px]" />
        <div className="hero-orb absolute top-[60%] right-[10%] w-96 h-96 bg-purple-500/10 rounded-full blur-[120px]" />
        <div className="hero-orb absolute bottom-[10%] left-[30%] w-64 h-64 bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="hero-orb absolute top-[30%] right-[25%] w-48 h-48 bg-amber-500/8 rounded-full blur-[60px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-center py-6">
        <Logo height={48} />
      </header>

      {/* Main Content */}
      <main className="relative z-10 px-4 pb-12">
        <div className="max-w-5xl mx-auto">

          {/* Hero Section */}
          <section ref={heroRef} className="text-center py-8 md:py-12">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] backdrop-blur-sm border border-white/10 mb-6">
              <SiYoutube className="h-4 w-4 text-red-500" />
              <span className="text-sm font-medium">Multiplayer YouTube Oyunu</span>
            </div>

            {/* Main Title */}
            <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
              <span className="hero-title-char inline-block">Arkadaşların</span>
              <br />
              <span className="hero-title-char inline-block">Ne&nbsp;</span>
              <span className="hero-title-char inline-block bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent">İzliyor?</span>
            </h1>

            {/* Subtitle */}
            <p className="text-muted-foreground text-base md:text-lg max-w-md mx-auto mb-8">
              YouTube hesabını bağla, arkadaşlarını davet et.
              <br />
              Tahmin et, puan topla, eğlen!
            </p>

            {/* Stats */}
            <div className="flex justify-center gap-6 md:gap-10 mb-10">
              <div className="text-center">
                <div className="stat-number text-2xl md:text-3xl font-black bg-gradient-to-r from-primary to-red-500 bg-clip-text text-transparent" data-value="8">0</div>
                <div className="text-xs text-muted-foreground">Oyun Modu</div>
              </div>
              <div className="text-center">
                <div className="stat-number text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent" data-value="12">0</div>
                <div className="text-xs text-muted-foreground">Max Oyuncu</div>
              </div>
              <div className="text-center">
                <div className="stat-number text-2xl md:text-3xl font-black bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent" data-value="25">0</div>
                <div className="text-xs text-muted-foreground">Max Tur</div>
              </div>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-6">
              <Link href="/oda-olustur">
                <Button size="lg" className="w-full sm:w-auto h-12 px-8 gap-2 text-base font-bold bg-gradient-to-r from-primary to-red-600 border-0 shadow-lg shadow-primary/25" data-testid="button-create-room">
                  <Plus className="h-5 w-5" />
                  Oda Oluştur
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Oda Kodu"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  maxLength={6}
                  className="w-28 h-12 text-center font-mono text-lg bg-white/[0.03] border-white/10"
                  data-testid="input-room-code"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!roomCode.trim()}
                  size="lg"
                  variant="outline"
                  className="h-12 px-6 gap-2 bg-white/[0.03] border-white/10"
                  data-testid="button-join-room"
                >
                  <ArrowRight className="h-5 w-5" />
                  Katıl
                </Button>
              </div>
            </div>
          </section>

          {/* Game Modes Grid */}
          <section ref={modesRef} className="py-8">
            <div className="text-center mb-6">
              <h2 className="text-xl font-bold mb-2">8 Farklı Oyun Modu</h2>
              <p className="text-sm text-muted-foreground">Tahmin ve karşılaştırma modlarıyla eğlenceyi katla</p>
            </div>

            <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
              {GAME_MODES.map((mode, i) => {
                const Icon = mode.icon;
                return (
                  <div
                    key={mode.id}
                    className="mode-card-anim flex flex-col items-center gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 cursor-default"
                    style={{ animationDelay: `${i * 50}ms` }}
                    data-testid={`card-mode-${mode.id}`}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-[10px] md:text-xs font-medium text-center leading-tight">{mode.title}</span>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Interactive Demo Section */}
          <section ref={demoRef} className="py-8">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Demo Card */}
              <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-red-600 flex items-center justify-center">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold">Canlı Demo</span>
                  <span className="ml-auto flex items-center gap-1 text-xs text-emerald-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Aktif
                  </span>
                </div>

                {/* Demo Question */}
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 mb-4">
                  <div className="text-xs text-muted-foreground mb-2">Soru {activeDemo + 1}/3</div>
                  <div className="flex items-center gap-3">
                    <div className="w-16 h-12 rounded-lg bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
                      <SiYoutube className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {activeDemo === 0 && "Bu videoyu kim beğenmiş?"}
                        {activeDemo === 1 && "Hangi kanal daha popüler?"}
                        {activeDemo === 2 && "Bu kanala kim abone?"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">20 saniye kaldı...</p>
                    </div>
                  </div>
                </div>

                {/* Demo Players */}
                <div className="grid grid-cols-2 gap-2">
                  {DEMO_PLAYERS.map((player, i) => (
                    <div
                      key={player.name}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                        i === activeDemo ? "bg-primary/10 border border-primary/30" : "bg-white/[0.02] border border-transparent"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                        i === activeDemo ? "bg-primary text-white" : "bg-white/10"
                      }`}>
                        {player.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{player.name}</p>
                        <p className="text-[10px] text-muted-foreground">{player.score} puan</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* How to Play */}
              <div className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold">Nasıl Oynanır?</span>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                    <div>
                      <p className="text-sm font-medium">Oda Oluştur</p>
                      <p className="text-xs text-muted-foreground">6 haneli kod ile arkadaşlarını davet et</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                    <div>
                      <p className="text-sm font-medium">YouTube Bağla</p>
                      <p className="text-xs text-muted-foreground">Beğenilerin ve aboneliklerin oyuna eklenir</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                    <div>
                      <p className="text-sm font-medium">Tahmin Et!</p>
                      <p className="text-xs text-muted-foreground">Doğru cevapla +5 puan, seri bonusu +10</p>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-white/5 flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-xs">
                    <Users className="h-3.5 w-3.5 text-blue-400" />
                    <span>2-12 Kişi</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-xs">
                    <Zap className="h-3.5 w-3.5 text-amber-400" />
                    <span>Yıldırım Turları</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 text-xs">
                    <Trophy className="h-3.5 w-3.5 text-yellow-400" />
                    <span>Seri Bonus</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="py-8">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-red-500/5 border border-primary/20 text-center">
              <SiYoutube className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Hemen Oynamaya Başla!</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm mx-auto">
                Arkadaşlarını topla, YouTube hesabını bağla ve eğlenceli bir yarışmaya başla.
              </p>
              <Link href="/oda-olustur">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-red-600 border-0" data-testid="button-cta-create">
                  <Plus className="h-5 w-5" />
                  Oda Oluştur
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Link href="/gizlilik-politikasi">
              <span className="hover:text-foreground transition-colors" data-testid="link-privacy">Gizlilik</span>
            </Link>
            <span className="opacity-30">|</span>
            <Link href="/kullanim-kosullari">
              <span className="hover:text-foreground transition-colors" data-testid="link-terms">Kullanım Koşulları</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span>by</span>
            <a href="https://toov.com.tr" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary transition-colors" data-testid="link-developer">
              TOOV
            </a>
            <span className="opacity-30">•</span>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-red-400 transition-colors" data-testid="link-youtube">
              <SiYoutube className="h-3.5 w-3.5" />
              YouTube
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
