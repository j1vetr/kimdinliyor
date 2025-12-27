import { Link } from "wouter";
import { Users, Plus, ArrowRight, ThumbsUp, UserPlus, Eye, Clock, Heart, Timer, Disc3, ChevronRight, Zap, Trophy } from "lucide-react";
import { SiYoutube, SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";

const TAHMIN_MODLARI = [
  {
    id: "who_liked",
    title: "Kim Beğenmiş?",
    desc: "Ekrandaki videoyu hangi oyuncu beğenmiş? Tahmin et!",
    icon: ThumbsUp,
    color: "#ef4444",
  },
  {
    id: "who_subscribed",
    title: "Kim Abone?",
    desc: "Bu kanala hangi oyuncu abone? Doğru tahmini yap!",
    icon: UserPlus,
    color: "#f97316",
  },
  {
    id: "oldest_like",
    title: "İlk Aşkım",
    desc: "En eski beğenilen video kimin? Nostaljik yarış!",
    icon: Heart,
    color: "#ec4899",
  },
];

const KARSILASTIRMA_MODLARI = [
  {
    id: "which_older",
    title: "Hangisi Daha Eski?",
    desc: "İki videodan hangisi daha önce yüklendi?",
    icon: Clock,
    color: "#3b82f6",
  },
  {
    id: "most_viewed",
    title: "En Çok İzlenen",
    desc: "Hangi video daha fazla izlenmiş?",
    icon: Eye,
    color: "#10b981",
  },
  {
    id: "which_longer",
    title: "Hangisi Daha Uzun?",
    desc: "İki videodan hangisi daha uzun süreli?",
    icon: Timer,
    color: "#8b5cf6",
  },
  {
    id: "which_more_subs",
    title: "Hangisi Daha Popüler?",
    desc: "Hangi kanalın daha fazla abonesi var?",
    icon: Users,
    color: "#06b6d4",
  },
  {
    id: "which_more_videos",
    title: "Hangisi Daha Emektar?",
    desc: "Hangi kanal daha fazla video yüklemiş?",
    icon: Disc3,
    color: "#f59e0b",
  },
];

// Soft dark colors for lobby animation
const LIVE_LOBBIES = [
  {
    name: "Efsane Oda",
    players: [
      { name: "Beren", initial: "B", status: "Hazır" },
      { name: "Selin", initial: "S", status: "Bekliyor" },
      { name: "Duru", initial: "D", status: "Hazır" },
      { name: "Mert", initial: "M", status: "Bekliyor" },
    ],
    count: "4/6",
  },
  {
    name: "Gece Yarisi",
    players: [
      { name: "Ali", initial: "A", status: "Hazır" },
      { name: "Zeynep", initial: "Z", status: "Hazır" },
      { name: "Can", initial: "C", status: "Hazır" },
    ],
    count: "3/4",
  },
  {
    name: "YouTube Masters",
    players: [
      { name: "Ece", initial: "E", status: "Hazır" },
      { name: "Burak", initial: "B", status: "Bekliyor" },
      { name: "Deniz", initial: "D", status: "Hazır" },
      { name: "Aylin", initial: "A", status: "Hazır" },
    ],
    count: "4/8",
  },
  {
    name: "Tahmin Ustaları",
    players: [
      { name: "Melis", initial: "M", status: "Hazır" },
      { name: "Ozan", initial: "O", status: "Hazır" },
    ],
    count: "2/4",
  },
  {
    name: "Video Avcilari",
    players: [
      { name: "Yigit", initial: "Y", status: "Hazır" },
      { name: "Sude", initial: "S", status: "Bekliyor" },
      { name: "Emre", initial: "E", status: "Hazır" },
    ],
    count: "3/6",
  },
];

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [, setLocation] = useLocation();
  const [currentLobbyIndex, setCurrentLobbyIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [activeRooms, setActiveRooms] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentLobbyIndex((prev) => (prev + 1) % LIVE_LOBBIES.length);
        setActiveRooms(Math.floor(Math.random() * 8) + 10);
        setIsTransitioning(false);
      }, 300);
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      setLocation(`/oyun/${roomCode.trim().toUpperCase()}`);
    }
  };

  const currentLobby = LIVE_LOBBIES[currentLobbyIndex];

  return (
    <div className="home-page">
      <div className="home-bg-pattern" />
      
      <header className="home-header">
        <Logo height={56} />
      </header>

      <main className="home-main">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-content">
            <div className="hero-badge-white">
              <SiYoutube className="hero-badge-icon" />
              <span>YouTube Tahmin Yarışması</span>
            </div>
            
            <h1 className="hero-title-alt">
              <span className="hero-title-white">Arkadaşların</span>
              <span className="hero-title-white">Ne <span className="hero-title-red">İzliyor?</span></span>
            </h1>
            
            <p className="hero-desc-alt">
              YouTube hesabını bağla, arkadaşlarını davet et.<br />
              Kim hangi videoyu beğenmiş, kime abone?<br />
              Tahmin et, puan topla, eğlen!
            </p>

            <div className="hero-features">
              <div className="hero-feature-chip">
                <Users className="hero-feature-icon" />
                <span>2-12 Kişi</span>
              </div>
              <div className="hero-feature-chip">
                <Zap className="hero-feature-icon" />
                <span>8 Mod</span>
              </div>
              <div className="hero-feature-chip">
                <Trophy className="hero-feature-icon" />
                <span>Seri Bonus</span>
              </div>
            </div>
          </div>

          {/* Right Side - Live Lobby Preview Card */}
          <div className="hero-lobby-preview">
            <div className="hero-lobby-card">
              <div className="hero-lobby-header">
                <div className="hero-lobby-live">
                  <span className="hero-live-dot" />
                  <span>Canlı Lobiler</span>
                </div>
                <span className="hero-lobby-count">{activeRooms} Aktif Oda</span>
              </div>
              
              <div className={`hero-lobby-room ${isTransitioning ? 'transitioning' : ''}`}>
                <span className="hero-room-name">{currentLobby.name}</span>
                <span className="hero-room-count">{currentLobby.count}</span>
              </div>

              <div className={`hero-lobby-players ${isTransitioning ? 'transitioning' : ''}`}>
                {currentLobby.players.map((player, idx) => (
                  <div key={`${currentLobbyIndex}-${idx}`} className="hero-lobby-player" style={{ animationDelay: `${idx * 0.08}s` }}>
                    <div className="hero-lobby-avatar">
                      {player.initial}
                    </div>
                    <div className="hero-lobby-info">
                      <span className="hero-lobby-name">{player.name}</span>
                      <span className={`hero-lobby-status ${player.status === 'Hazır' ? 'ready' : ''}`}>{player.status}</span>
                    </div>
                    {player.status === "Hazır" && (
                      <div className="hero-lobby-signal">
                        <span /><span /><span />
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="hero-lobby-dots">
                {LIVE_LOBBIES.map((_, idx) => (
                  <span key={idx} className={`hero-lobby-dot ${idx === currentLobbyIndex ? 'active' : ''}`} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="play-options-section">
          <div className="play-options-grid">
            <div className="play-option-card">
              <div className="play-option-header">
                <div className="play-option-icon-wrap" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                  <Users style={{ color: '#ef4444' }} />
                </div>
                <h2 className="play-option-title">Arkadaşlarınla Oyna</h2>
              </div>
              <p className="play-option-desc">
                Özel bir oda oluştur, arkadaşlarını davet et. Kendi aranızda eğlenceli bir yarışma başlat!
              </p>
              <Link href="/oda-olustur">
                <Button className="play-option-btn" data-testid="button-create-room-2">
                  <Plus />
                  Oda Oluştur
                  <ChevronRight />
                </Button>
              </Link>
            </div>

            <div className="play-option-card">
              <div className="play-option-header">
                <div className="play-option-icon-wrap" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                  <ArrowRight style={{ color: '#3b82f6' }} />
                </div>
                <h2 className="play-option-title">Odaya Katıl</h2>
              </div>
              <p className="play-option-desc">
                Arkadaşından aldığın 6 haneli oda kodunu gir ve hemen oyuna dahil ol!
              </p>
              <div className="join-form">
                <Input
                  placeholder="Oda Kodu"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                  maxLength={7}
                  className="join-input"
                  data-testid="input-room-code"
                />
                <Button
                  onClick={handleJoinRoom}
                  disabled={!roomCode.trim()}
                  variant="outline"
                  className="join-btn"
                  data-testid="button-join-room"
                >
                  Katıl
                </Button>
              </div>
            </div>
          </div>
        </section>

        <section className="modes-section">
          <div className="modes-container">
            <div className="section-header">
              <div className="section-line" />
              <h2 className="section-title">8 Farklı Mod</h2>
              <div className="section-line" />
            </div>

            <div className="modes-showcase">
              <div className="modes-category-panel">
                <div className="modes-panel-header">
                  <Badge variant="outline" className="modes-panel-badge">
                    <SiGoogle className="modes-badge-icon" />
                    YouTube Hesabı Gerekli
                  </Badge>
                </div>
                <h3 className="modes-panel-title">Tahmin Modları</h3>
                <p className="modes-panel-desc">Arkadaşlarının YouTube aktivitelerini tahmin et</p>
                <div className="modes-panel-list">
                  {TAHMIN_MODLARI.map((mode, idx) => {
                    const Icon = mode.icon;
                    return (
                      <div key={mode.id} className="modes-panel-item" data-testid={`card-mode-${mode.id}`}>
                        <div className="modes-panel-num">{idx + 1}</div>
                        <div className="modes-panel-icon">
                          <Icon />
                        </div>
                        <div className="modes-panel-content">
                          <span className="modes-panel-name">{mode.title}</span>
                          <span className="modes-panel-hint">{mode.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="modes-divider">
                <span className="modes-divider-line" />
                <span className="modes-divider-text">VS</span>
                <span className="modes-divider-line" />
              </div>

              <div className="modes-category-panel modes-category-panel-alt">
                <div className="modes-panel-header">
                  <Badge variant="secondary" className="modes-panel-badge-free">
                    Herkes Oynayabilir
                  </Badge>
                </div>
                <h3 className="modes-panel-title">Karşılaştırma Modları</h3>
                <p className="modes-panel-desc">Trend videolar ve popüler kanallarla yarış</p>
                <div className="modes-panel-list">
                  {KARSILASTIRMA_MODLARI.map((mode, idx) => {
                    const Icon = mode.icon;
                    return (
                      <div key={mode.id} className="modes-panel-item" data-testid={`card-mode-${mode.id}`}>
                        <div className="modes-panel-num">{idx + 1}</div>
                        <div className="modes-panel-icon">
                          <Icon />
                        </div>
                        <div className="modes-panel-content">
                          <span className="modes-panel-name">{mode.title}</span>
                          <span className="modes-panel-hint">{mode.desc}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="howto-section">
          <div className="howto-container">
            <div className="section-header">
              <div className="section-line" />
              <h2 className="section-title">Nasıl Oynanır?</h2>
              <div className="section-line" />
            </div>

            <div className="howto-steps">
              <div className="howto-step">
                <div className="howto-step-num">1</div>
                <div className="howto-step-content">
                  <h3 className="howto-step-title">Oda Oluştur veya Katıl</h3>
                  <p className="howto-step-desc">
                    6 haneli kod ile yeni bir oda aç veya arkadaşının paylaştığı kodu girerek katıl.
                  </p>
                </div>
              </div>

              <div className="howto-connector" />

              <div className="howto-step">
                <div className="howto-step-num">2</div>
                <div className="howto-step-content">
                  <h3 className="howto-step-title">YouTube Hesabını Bağla</h3>
                  <p className="howto-step-desc">
                    Tahmin modları için Google ile giriş yap. Beğendiğin videolar ve aboneliklerin oyuna eklenir.
                  </p>
                </div>
              </div>

              <div className="howto-connector" />

              <div className="howto-step">
                <div className="howto-step-num">3</div>
                <div className="howto-step-content">
                  <h3 className="howto-step-title">Tahmin Et ve Kazan!</h3>
                  <p className="howto-step-desc">
                    Her turda soruları cevapla, seri bonusu yakala ve liderlik tablosunda zirveye çık!
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="cta-section">
          <div className="cta-card">
            <div className="cta-content">
              <SiYoutube className="cta-icon" />
              <h3 className="cta-title">Hemen Başla!</h3>
              <p className="cta-desc">
                Arkadaşlarını topla, YouTube hesabını bağla ve yarışmaya katıl.
              </p>
              <Link href="/oda-olustur">
                <Button size="lg" variant="secondary" className="cta-btn" data-testid="button-cta-create">
                  <Plus />
                  Oda Oluştur
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <div className="footer-content">
          <div className="footer-links">
            <Link href="/gizlilik-politikasi">
              <span className="footer-link" data-testid="link-privacy">Gizlilik Politikası</span>
            </Link>
            <span className="footer-divider">|</span>
            <Link href="/kullanim-kosullari">
              <span className="footer-link" data-testid="link-terms">Kullanım Koşulları</span>
            </Link>
          </div>
          <div className="footer-credits">
            <span>Geliştirici: </span>
            <a href="https://toov.com.tr" target="_blank" rel="noopener noreferrer" className="footer-dev" data-testid="link-developer">
              TOOV
            </a>
            <span className="footer-heart">&lt;3</span>
          </div>
          <div className="footer-powered">
            <span>Powered by </span>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="footer-yt" data-testid="link-youtube">
              <SiYoutube />
              <span>YouTube</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
