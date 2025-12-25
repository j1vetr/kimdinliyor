import { Link } from "wouter";
import { Users, Plus, Video, Play, Film, Tv, ArrowRight, ThumbsUp, UserPlus, Eye, UsersRound, Zap, Trophy, Youtube } from "lucide-react";
import { SiYoutube, SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";

const GAME_MODES = [
  {
    id: "liked",
    title: "Kim Beğenmiş?",
    description: "Ekrandaki videoyu hangi arkadaşın beğendiğini tahmin et.",
    icon: ThumbsUp,
    color: "from-red-500/20 to-red-600/5",
    iconColor: "text-red-500",
  },
  {
    id: "subscribed",
    title: "Kim Abone?",
    description: "Ekrandaki kanala hangi arkadaşın abone olduğunu tahmin et.",
    icon: UserPlus,
    color: "from-orange-500/20 to-orange-600/5",
    iconColor: "text-orange-500",
  },
  {
    id: "viewCount",
    title: "Sayı Tahmini",
    description: "Videonun izlenme sayısını tahmin et. En yakın tahmin kazanır!",
    icon: Eye,
    color: "from-blue-500/20 to-blue-600/5",
    iconColor: "text-blue-500",
  },
  {
    id: "subscriberCount",
    title: "Abone Sayısı",
    description: "Kanalın abone sayısını tahmin et. En yakın tahmin kazanır!",
    icon: UsersRound,
    color: "from-green-500/20 to-green-600/5",
    iconColor: "text-green-500",
  },
];

const HOW_TO_PLAY = [
  {
    step: 1,
    title: "Oda Oluştur veya Katıl",
    description: "Yeni bir oda oluştur veya arkadaşının paylaştığı oda kodunu girerek katıl.",
    icon: Users,
  },
  {
    step: 2,
    title: "YouTube Hesabını Bağla",
    description: "Google hesabınla giriş yap. Beğendiğin videolar ve aboneliklerin oyunda kullanılacak.",
    icon: Youtube,
  },
  {
    step: 3,
    title: "Tahmin Et ve Kazan",
    description: "Her turda soruları cevapla, doğru tahminlerle puan topla ve birinci ol!",
    icon: Trophy,
  },
];

function FloatingIcons() {
  const icons = useMemo(() => {
    const iconTypes = [Video, Play, Film, Tv, "youtube"];
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      type: iconTypes[i % iconTypes.length],
      left: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 20,
      size: 16 + Math.random() * 24,
      opacity: 0.02 + Math.random() * 0.02,
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
          {icon.type === "youtube" ? (
            <SiYoutube size={icon.size} className="text-red-500" />
          ) : (
            <icon.type
              size={icon.size}
              className="text-red-500"
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
    <div className="min-h-screen bg-background flex flex-col relative">
      <FloatingIcons />
      
      <header className="flex items-center justify-center p-4 border-b border-border relative z-10">
        <Logo height={72} />
      </header>

      <main className="flex-1 relative z-10">
        <section className="py-12 md:py-16 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <SiYoutube className="h-4 w-4" />
              <span>YouTube tabanlı çok oyunculu oyun</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Arkadaşlarınla{" "}
              <span className="text-primary">YouTube</span>
              <br />
              Bilgi Yarışması
            </h1>
            
            <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
              YouTube hesabını bağla, arkadaşlarınla bir oda oluştur ve eğlenceli sorularla 
              birbirinizi ne kadar iyi tanıdığınızı test edin!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/oda-olustur">
                <Button size="lg" className="w-full sm:w-auto gap-2 text-base px-8" data-testid="button-create-room-hero">
                  <Plus className="h-5 w-5" />
                  Oda Oluştur
                </Button>
              </Link>
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto gap-2 text-base px-8"
                onClick={() => document.getElementById('join-section')?.scrollIntoView({ behavior: 'smooth' })}
                data-testid="button-join-room-hero"
              >
                <Users className="h-5 w-5" />
                Odaya Katıl
              </Button>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-4 bg-muted/30">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 text-primary mb-3">
                <Zap className="h-5 w-5" />
                <span className="text-sm font-medium uppercase tracking-wider">Oyun Modları</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold">
                4 Farklı Oyun Modu
              </h2>
              <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
                Her mod farklı YouTube verileri üzerinden sorular sorar.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {GAME_MODES.map((mode) => {
                const Icon = mode.icon;
                return (
                  <Card 
                    key={mode.id}
                    className="overflow-visible border-2 border-transparent hover:border-primary/20 transition-all duration-300"
                  >
                    <CardContent className="p-5 md:p-6">
                      <div className="flex items-start gap-4">
                        <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center shrink-0`}>
                          <Icon className={`h-6 w-6 ${mode.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold mb-1">{mode.title}</h3>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {mode.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Nasıl Oynanır?
              </h2>
              <p className="text-muted-foreground">
                3 kolay adımda arkadaşlarınla oynamaya başla.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
              {HOW_TO_PLAY.map((item) => {
                const Icon = item.icon;
                return (
                  <div key={item.step} className="text-center">
                    <div className="relative inline-flex mb-4">
                      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="absolute -top-2 -right-2 h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                        {item.step}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section id="join-section" className="py-12 md:py-16 px-4 bg-muted/30">
          <div className="max-w-lg mx-auto">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold mb-2">
                Hemen Başla
              </h2>
              <p className="text-muted-foreground">
                Yeni bir oda oluştur veya mevcut bir odaya katıl.
              </p>
            </div>

            <div className="space-y-4">
              <Link href="/oda-olustur">
                <Card 
                  className="hover-elevate active-elevate-2 cursor-pointer group overflow-visible border-2 border-transparent hover:border-primary/30 transition-all duration-300"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-105 transition-transform duration-300">
                        <Plus className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
                          Yeni Oda Oluştur
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Oyun modlarını seç ve arkadaşlarını davet et.
                        </p>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <Card className="overflow-visible">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="h-14 w-14 rounded-xl bg-gradient-to-br from-secondary to-secondary/50 flex items-center justify-center">
                      <Users className="h-7 w-7 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold">Odaya Katıl</h3>
                      <p className="text-sm text-muted-foreground">
                        Arkadaşından aldığın oda kodunu gir.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <Input
                        placeholder="Oda kodu"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                        onKeyDown={handleKeyDown}
                        maxLength={7}
                        className="uppercase text-center font-mono text-lg tracking-widest h-12"
                        data-testid="input-room-code"
                      />
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

            <div className="mt-8 p-4 rounded-xl bg-card border border-border">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <SiGoogle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-medium text-sm mb-1">Google ile Güvenli Giriş</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    YouTube verilerine erişim için Google hesabınla giriş yapman gerekiyor. 
                    Sadece beğendiğin videolar ve abone olduğun kanallar oyunda kullanılacak.
                  </p>
                </div>
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
    </div>
  );
}
