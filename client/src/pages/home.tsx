import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { Users, Plus, ArrowRight, ThumbsUp, UserPlus, Eye, Clock, Heart, Timer, Disc3, Zap, Trophy, Sparkles, Play, ChevronRight } from "lucide-react";
import { SiYoutube, SiGoogle } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { motion } from "framer-motion";
import { GradientText, TypeWriter, CountUp } from "@/components/ui/animated-text";
import { SpotlightCard, TiltCard } from "@/components/ui/spotlight-card";
import { AuroraBackground, GridBackground } from "@/components/ui/animated-background";

const GAME_MODES = [
  { id: "who_liked", label: "Kim Beğenmiş?", icon: ThumbsUp, color: "text-red-400", category: "guess" },
  { id: "who_subscribed", label: "Kim Abone?", icon: UserPlus, color: "text-orange-400", category: "guess" },
  { id: "oldest_like", label: "İlk Aşkım", icon: Heart, color: "text-pink-400", category: "guess" },
  { id: "which_older", label: "Hangisi Eski?", icon: Clock, color: "text-blue-400", category: "compare" },
  { id: "most_viewed", label: "Çok İzlenen", icon: Eye, color: "text-emerald-400", category: "compare" },
  { id: "which_longer", label: "Daha Uzun?", icon: Timer, color: "text-purple-400", category: "compare" },
  { id: "which_more_subs", label: "Daha Popüler?", icon: Users, color: "text-cyan-400", category: "compare" },
  { id: "which_more_videos", label: "Daha Emektar?", icon: Disc3, color: "text-amber-400", category: "compare" },
];

const STATS = [
  { value: 8, suffix: "", label: "Oyun Modu" },
  { value: 12, suffix: "", label: "Max Oyuncu" },
  { value: 100, suffix: "%", label: "Ücretsiz" },
];

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [, setLocation] = useLocation();
  const [activeMode, setActiveMode] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveMode((prev) => (prev + 1) % GAME_MODES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      setLocation(`/oyun/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <AuroraBackground />
      <GridBackground />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-center py-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Logo height={48} />
        </motion.div>
      </header>

      <main className="relative z-10 px-4 pb-16">
        {/* Hero */}
        <section className="max-w-4xl mx-auto text-center pt-8 pb-16">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-6"
          >
            <SiYoutube className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium">YouTube Tahmin Oyunu</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl sm:text-5xl md:text-6xl font-black leading-tight mb-4"
          >
            Arkadaşların
            <br />
            <span className="inline-block">
              Ne{" "}
              <GradientText from="from-primary" to="to-orange-500">
                <TypeWriter words={["İzliyor?", "Beğeniyor?", "Takip Ediyor?"]} typingSpeed={80} />
              </GradientText>
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base sm:text-lg text-muted-foreground max-w-md mx-auto mb-8"
          >
            YouTube hesabını bağla, arkadaşlarını davet et.
            <br className="hidden sm:block" />
            Kim hangi videoyu beğenmiş? Tahmin et, puan topla!
          </motion.p>

          {/* Stats Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="flex items-center justify-center gap-6 sm:gap-10 mb-10"
          >
            {STATS.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl sm:text-3xl font-black">
                  <CountUp end={stat.value} duration={1.5} suffix={stat.suffix} />
                </div>
                <div className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3"
          >
            <Link href="/oda-olustur">
              <Button size="lg" className="h-12 px-6 gap-2 text-base font-bold bg-gradient-to-r from-primary to-red-600 border-0 shadow-lg shadow-primary/25" data-testid="button-create-room">
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
                maxLength={7}
                className="h-12 w-32 text-center font-mono text-base bg-white/5 border-white/10"
                data-testid="input-room-code"
              />
              <Button
                variant="outline"
                size="lg"
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                className="h-12 px-4 gap-1 bg-white/5 border-white/10"
                data-testid="button-join-room"
              >
                <ArrowRight className="h-4 w-4" />
                Katıl
              </Button>
            </div>
          </motion.div>
        </section>

        {/* Game Modes Showcase */}
        <section className="max-w-3xl mx-auto py-12">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold mb-2">8 Farklı Oyun Modu</h2>
            <p className="text-sm text-muted-foreground">Tahmin ve karşılaştırma modlarıyla eğlenceyi katla</p>
          </motion.div>

          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 mb-6">
            {GAME_MODES.map((mode, i) => {
              const Icon = mode.icon;
              const isActive = i === activeMode;
              return (
                <motion.div
                  key={mode.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className={`relative flex flex-col items-center justify-center p-3 rounded-xl transition-all cursor-pointer ${
                    isActive 
                      ? "bg-white/10 border border-white/20 scale-105" 
                      : "bg-white/[0.02] border border-transparent hover:bg-white/[0.05]"
                  }`}
                  onClick={() => setActiveMode(i)}
                  data-testid={`mode-${mode.id}`}
                >
                  <Icon className={`h-5 w-5 mb-1 ${isActive ? mode.color : "text-muted-foreground"}`} />
                  <span className={`text-[9px] font-medium text-center leading-tight ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {mode.label.split(" ")[0]}
                  </span>
                  {isActive && (
                    <motion.div
                      layoutId="mode-indicator"
                      className="absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-primary"
                    />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Active Mode Detail */}
          <motion.div
            key={activeMode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-2xl bg-white/[0.03] backdrop-blur-sm border border-white/10 text-center"
          >
            {(() => {
              const mode = GAME_MODES[activeMode];
              const Icon = mode.icon;
              return (
                <>
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl bg-white/10 mb-3 ${mode.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold mb-1">{mode.label}</h3>
                  <p className="text-xs text-muted-foreground mb-2">
                    {mode.category === "guess" ? "YouTube hesabı gerekli" : "Giriş gerekmez"}
                  </p>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    mode.category === "guess" ? "bg-red-500/10 text-red-400" : "bg-blue-500/10 text-blue-400"
                  }`}>
                    {mode.category === "guess" ? (
                      <><SiGoogle className="h-2.5 w-2.5" /> Tahmin Modu</>
                    ) : (
                      <><Sparkles className="h-2.5 w-2.5" /> Karşılaştırma</>
                    )}
                  </span>
                </>
              );
            })()}
          </motion.div>
        </section>

        {/* Features */}
        <section className="max-w-4xl mx-auto py-12">
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Users, title: "2-12 Oyuncu", desc: "Arkadaşlarınla özel odada yarış", color: "from-blue-500 to-cyan-500" },
              { icon: Zap, title: "Seri Bonus", desc: "Art arda doğrulara ekstra puan", color: "from-amber-500 to-orange-500" },
              { icon: Trophy, title: "Liderlik", desc: "Her oyun sonunda sıralama", color: "from-purple-500 to-pink-500" },
            ].map((feature, i) => (
              <TiltCard key={i} tiltAmount={5}>
                <SpotlightCard
                  className="p-5 rounded-2xl bg-white/[0.02] border border-white/10 text-center h-full"
                  spotlightColor="rgba(255,255,255,0.05)"
                >
                  <div className={`inline-flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} mb-3`}>
                    <feature.icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-sm font-bold mb-1">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.desc}</p>
                </SpotlightCard>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* How to Play */}
        <section className="max-w-2xl mx-auto py-12">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-bold mb-2">Nasıl Oynanır?</h2>
          </motion.div>

          <div className="space-y-4">
            {[
              { step: 1, title: "Oda Oluştur", desc: "6 haneli kod ile yeni oda aç veya mevcut odaya katıl" },
              { step: 2, title: "YouTube Bağla", desc: "Tahmin modları için Google hesabını bağla" },
              { step: 3, title: "Oyna & Kazan", desc: "Soruları cevapla, puan topla, zirveye çık!" },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/5"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-red-600 flex items-center justify-center shrink-0">
                  <span className="text-lg font-black text-white">{item.step}</span>
                </div>
                <div>
                  <h3 className="text-sm font-bold">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="max-w-md mx-auto py-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="p-6 rounded-2xl bg-gradient-to-br from-primary/20 to-red-500/10 border border-primary/20 text-center"
          >
            <SiYoutube className="h-10 w-10 text-primary mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2">Hemen Başla!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Arkadaşlarını topla, yarışmaya katıl.
            </p>
            <Link href="/oda-olustur">
              <Button size="lg" className="h-12 px-8 gap-2 font-bold bg-gradient-to-r from-primary to-red-600 border-0" data-testid="button-cta-create">
                <Play className="h-5 w-5" />
                Oda Oluştur
              </Button>
            </Link>
          </motion.div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <Link href="/gizlilik-politikasi">
              <span className="hover:text-foreground transition-colors" data-testid="link-privacy">Gizlilik</span>
            </Link>
            <span>|</span>
            <Link href="/kullanim-kosullari">
              <span className="hover:text-foreground transition-colors" data-testid="link-terms">Koşullar</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span>by</span>
            <a href="https://toov.com.tr" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground hover:text-primary transition-colors" data-testid="link-developer">
              TOOV
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <span>Powered by</span>
            <a href="https://youtube.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors" data-testid="link-youtube">
              <SiYoutube className="h-3.5 w-3.5" />
              <span className="font-medium">YouTube</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
