import { Link } from "wouter";
import { Users, Plus, Video, Play, Film, Tv, ArrowRight, ThumbsUp, UserPlus, Eye, UsersRound, Zap, Trophy, Youtube } from "lucide-react";
import { SiYoutube } from "react-icons/si";
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
        <section className="py-16 md:py-24 px-4 relative">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none" />
          
          <div className="max-w-xl mx-auto relative">
            <div className="text-center mb-10">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                Arkadaşlarınla{" "}
                <span className="text-primary">YouTube</span>
                {" "}Bilgi Yarışması
              </h1>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
                YouTube hesabını bağla, arkadaşlarınla oda oluştur ve birbirinizi ne kadar iyi tanıdığınızı test edin!
              </p>
            </div>

            <Card className="overflow-visible border border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-6 md:p-8 space-y-6">
                <Link href="/oda-olustur" className="block">
                  <Button 
                    size="lg" 
                    className="w-full gap-3 text-base h-14 text-lg font-semibold"
                    data-testid="button-create-room"
                  >
                    <Plus className="h-5 w-5" />
                    Yeni Oda Oluştur
                  </Button>
                </Link>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-card px-4 text-sm text-muted-foreground">veya</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground text-center">
                    Arkadaşının paylaştığı oda kodunu gir
                  </p>
                  <div className="flex gap-3">
                    <Input
                      placeholder="Oda kodu gir"
                      value={roomCode}
                      onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                      onKeyDown={handleKeyDown}
                      maxLength={7}
                      className="flex-1 uppercase text-center font-mono text-lg tracking-widest h-12"
                      data-testid="input-room-code"
                    />
                    <Button
                      onClick={handleJoinRoom}
                      disabled={!roomCode.trim()}
                      size="lg"
                      variant="secondary"
                      className="h-12 px-6"
                      data-testid="button-join-room"
                    >
                      Katıl
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-center gap-6 mt-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <SiYoutube className="h-4 w-4 text-red-500" />
                <span>YouTube API</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>2-10 Oyuncu</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span>4 Oyun Modu</span>
              </div>
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
              <div className="flex items-center justify-center gap-2 mt-6">
                <div className="h-1 w-8 rounded-full bg-primary/30" />
                <div className="h-1 w-12 rounded-full bg-primary" />
                <div className="h-1 w-8 rounded-full bg-primary/30" />
              </div>
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
