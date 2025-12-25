import { Link } from "wouter";
import { Users, Plus, ArrowRight, ThumbsUp, UserPlus, Eye, UsersRound, Zap, Trophy, Youtube, Play } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const ROTATING_WORDS = ["İzliyor", "Dinliyor", "Beğeniyor", "Takip Ediyor"];

const GAME_MODES = [
  {
    id: "liked",
    title: "Kim Beğenmiş?",
    tagline: "Arkadaşını yakala!",
    icon: ThumbsUp,
    accent: "bg-red-500",
    glow: "shadow-red-500/30",
  },
  {
    id: "subscribed",
    title: "Kim Abone?",
    tagline: "Kanalı bul, sahibini tahmin et!",
    icon: UserPlus,
    accent: "bg-orange-500",
    glow: "shadow-orange-500/30",
  },
  {
    id: "viewCount",
    title: "Sayı Tahmini",
    tagline: "İzlenme sayısını bil!",
    icon: Eye,
    accent: "bg-purple-500",
    glow: "shadow-purple-500/30",
  },
  {
    id: "subscriberCount",
    title: "Abone Sayısı",
    tagline: "Kanalın gücünü ölç!",
    icon: UsersRound,
    accent: "bg-emerald-500",
    glow: "shadow-emerald-500/30",
  },
];

const FAKE_PLAYERS = [
  { name: "Ahmet", avatar: "A", status: "online" },
  { name: "Zeynep", avatar: "Z", status: "online" },
  { name: "Can", avatar: "C", status: "playing" },
  { name: "Elif", avatar: "E", status: "online" },
];

function WaveformBar({ delay = 0 }: { delay?: number }) {
  return (
    <div 
      className="w-1 bg-primary rounded-full animate-waveform"
      style={{ 
        animationDelay: `${delay}ms`,
        height: '100%',
      }}
    />
  );
}

function RotatingWord() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % ROTATING_WORDS.length);
        setIsAnimating(false);
      }, 400);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <span className="relative inline-block">
      <span 
        className={`relative z-10 text-primary transition-all duration-400 ${
          isAnimating ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        {ROTATING_WORDS[currentIndex]}?
      </span>
      <span className="absolute -inset-1 bg-primary/20 blur-lg rounded-lg" />
    </span>
  );
}

function LiveLobbyPreview() {
  const [activeIndex, setActiveIndex] = useState(0);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % FAKE_PLAYERS.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative">
      <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-purple-500/20 to-primary/20 rounded-2xl blur-xl opacity-60" />
      <div className="relative bg-card/80 backdrop-blur-md rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-medium text-green-500">Canlı lobiler</span>
          </div>
          <span className="text-xs text-muted-foreground">12 aktif oda</span>
        </div>
        
        <div className="space-y-2">
          {FAKE_PLAYERS.map((player, i) => (
            <div 
              key={player.name}
              className={`flex items-center gap-3 p-2 rounded-lg transition-all duration-500 ${
                i === activeIndex ? 'bg-primary/10 scale-[1.02]' : 'bg-muted/30'
              }`}
            >
              <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
                {player.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{player.name}</p>
                <p className="text-[10px] text-muted-foreground">
                  {player.status === 'playing' ? 'Oyunda' : 'Bekliyor'}
                </p>
              </div>
              {i === activeIndex && (
                <div className="flex items-center gap-0.5 h-4">
                  <WaveformBar delay={0} />
                  <WaveformBar delay={150} />
                  <WaveformBar delay={300} />
                  <WaveformBar delay={150} />
                </div>
              )}
            </div>
          ))}
        </div>
        
        <div className="pt-2 border-t border-border/50 flex items-center justify-center">
          <span className="text-primary font-medium text-xs">Hemen katıl</span>
        </div>
      </div>
    </div>
  );
}

function FloatingThumbnails() {
  const thumbnails = [
    { id: 1, x: 10, y: 20, delay: 0, size: 60 },
    { id: 2, x: 80, y: 15, delay: 2, size: 50 },
    { id: 3, x: 25, y: 70, delay: 4, size: 45 },
    { id: 4, x: 70, y: 65, delay: 1, size: 55 },
    { id: 5, x: 50, y: 40, delay: 3, size: 40 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {thumbnails.map((thumb) => (
        <div
          key={thumb.id}
          className="absolute animate-float-slow opacity-[0.07]"
          style={{
            left: `${thumb.x}%`,
            top: `${thumb.y}%`,
            animationDelay: `${thumb.delay}s`,
          }}
        >
          <div 
            className="rounded-lg bg-primary/50 flex items-center justify-center"
            style={{ width: thumb.size, height: thumb.size * 0.6 }}
          >
            <Play className="w-4 h-4 text-white/50" />
          </div>
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
      const code = roomCode.trim();
      setLocation(`/oyun/${code}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && roomCode.trim()) {
      handleJoinRoom();
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/5 via-background to-background pointer-events-none" />
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none" style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
      }} />
      
      <header className="flex items-center justify-center p-6 relative z-10">
        <Logo height={72} />
      </header>

      <main className="flex-1 relative z-10 flex flex-col">
        <section className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 px-4 lg:px-16 py-12 lg:py-0 relative">
          <FloatingThumbnails />
          
          <div className="flex-1 max-w-xl lg:max-w-lg space-y-6 text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
              <span className="block">Arkadaşların</span>
              <span className="block">
                Ne <RotatingWord />
              </span>
            </h1>
            
            <p className="text-lg text-muted-foreground leading-relaxed max-w-md mx-auto lg:mx-0">
              YouTube hesabını bağla, arkadaşlarını davet et. Kim hangi videoyu beğenmiş, kime abone? Tahmin et, puan topla, eğlen!
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 justify-center lg:justify-start">
              <Link href="/oda-olustur" className="group">
                <Button 
                  size="lg" 
                  className="w-full sm:w-auto gap-2 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                  data-testid="button-create-room"
                >
                  <Plus className="h-5 w-5" />
                  Oda Oluştur
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </Link>
              
              <div className="flex items-center gap-2">
                <Input
                  placeholder="Oda kodu"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={handleKeyDown}
                  maxLength={7}
                  className="flex-1 sm:w-28 uppercase text-center font-mono tracking-widest h-10"
                  data-testid="input-room-code"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!roomCode.trim()}
                  variant="outline"
                  className="h-10"
                  data-testid="button-join-room"
                >
                  Katıl
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 justify-center lg:justify-start pt-4 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <Users className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-medium">2-12 Kişi</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <Zap className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-medium">4 Mod</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                <Trophy className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-medium">Seri Bonus</span>
              </div>
            </div>
          </div>

          <div className="w-full max-w-xs lg:max-w-sm hidden lg:block">
            <LiveLobbyPreview />
          </div>
        </section>

        <div className="relative h-24 -mt-12">
          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
            <polygon fill="hsl(var(--muted) / 0.3)" points="0,100 100,0 100,100" />
          </svg>
        </div>

        <section className="py-16 px-4 bg-muted/30 relative">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <div className="h-8 w-1 rounded-full bg-primary" />
              <h2 className="text-2xl font-bold">Oyun Modları</h2>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
              {GAME_MODES.map((mode, index) => {
                const Icon = mode.icon;
                return (
                  <div 
                    key={mode.id}
                    className={`group relative rounded-xl bg-card border border-border/50 p-4 lg:p-5 hover:border-border transition-all duration-300 hover:-translate-y-1 ${
                      index % 2 === 0 ? '' : 'lg:translate-y-4'
                    }`}
                  >
                    <div className={`absolute inset-0 rounded-xl ${mode.glow} shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
                    <div className="relative">
                      <div className={`inline-flex items-center justify-center h-10 w-10 rounded-lg ${mode.accent} mb-3`}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="font-bold text-sm lg:text-base mb-1">{mode.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {mode.tagline}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-16 px-4 relative">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-3 mb-10 justify-center">
              <div className="h-px flex-1 bg-gradient-to-r from-transparent to-border max-w-24" />
              <h2 className="text-2xl font-bold">Nasıl Oynanır?</h2>
              <div className="h-px flex-1 bg-gradient-to-l from-transparent to-border max-w-24" />
            </div>

            <div className="relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-primary via-primary/50 to-transparent hidden md:block" />
              
              <div className="space-y-8 md:space-y-0">
                {[
                  {
                    step: 1,
                    title: "Oda oluştur",
                    desc: "Altı haneli kod ile yeni bir oyun odası aç veya arkadaşının kodunu gir.",
                    icon: Users,
                  },
                  {
                    step: 2,
                    title: "YouTube hesabını bağla",
                    desc: "Google ile giriş yap. Beğendiğin videolar ve aboneliklerin oyuna eklenir.",
                    icon: Youtube,
                  },
                  {
                    step: 3,
                    title: "Tahmin et ve kazan!",
                    desc: "Her turda soruları cevapla, seri bonusu yakala ve liderliği al!",
                    icon: Trophy,
                  },
                ].map((item, i) => (
                  <div 
                    key={item.step}
                    className={`relative flex items-center gap-4 md:gap-8 ${
                      i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
                    }`}
                  >
                    <div className={`flex-1 ${i % 2 === 0 ? 'md:text-right' : 'md:text-left'}`}>
                      <div className={`inline-block bg-card border border-border/50 rounded-xl p-4 lg:p-5 max-w-sm ${
                        i % 2 === 0 ? 'md:ml-auto' : 'md:mr-auto'
                      }`}>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <item.icon className="h-4 w-4 text-primary" />
                          </div>
                          <h3 className="font-bold">{item.title}</h3>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {item.desc}
                        </p>
                      </div>
                    </div>
                    
                    <div className="hidden md:flex items-center justify-center">
                      <div className="h-10 w-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg z-10">
                        {item.step}
                      </div>
                    </div>
                    
                    <div className="flex-1 hidden md:block" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 px-4">
          <div className="max-w-xl mx-auto">
            <div className="relative rounded-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-red-600" />
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              }} />
              <div className="relative p-6 lg:p-8 text-center">
                <h3 className="text-xl lg:text-2xl font-bold text-white mb-2">
                  Hemen oynamaya başla!
                </h3>
                <p className="text-white/80 text-sm mb-5">
                  Arkadaşlarını topla ve YouTube yarışmasına katıl.
                </p>
                <Link href="/oda-olustur">
                  <Button 
                    size="lg" 
                    variant="secondary"
                    className="font-semibold gap-2"
                    data-testid="button-cta-create"
                  >
                    <SiYoutube className="h-5 w-5" />
                    Oda Oluştur
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-6 px-4 border-t border-border relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="flex flex-col items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <Link href="/gizlilik-politikasi">
                <span className="hover:text-primary transition-colors cursor-pointer" data-testid="link-privacy">
                  Gizlilik Politikası
                </span>
              </Link>
              <span className="text-border">|</span>
              <Link href="/kullanim-kosullari">
                <span className="hover:text-primary transition-colors cursor-pointer" data-testid="link-terms">
                  Kullanım Koşulları
                </span>
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-6">
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
                  href="https://youtube.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  data-testid="link-youtube"
                >
                  <SiYoutube size={20} className="text-red-500" />
                  <span className="font-semibold text-red-500">YouTube</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes waveform {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .animate-waveform {
          animation: waveform 0.6s ease-in-out infinite;
        }
        @keyframes float-slow {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(3deg); }
        }
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
