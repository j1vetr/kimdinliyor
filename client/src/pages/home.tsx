import { Link } from "wouter";
import { Users, Plus, ArrowRight, ThumbsUp, UserPlus, Eye, Clock, Heart, Timer, Disc3, Zap, Trophy, Play, Sparkles, ChevronRight } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { motion, useScroll, useTransform } from "framer-motion";
import { BlurText } from "@/components/ui/blur-text";
import { SplitText } from "@/components/ui/split-text";
import { GradientText } from "@/components/ui/gradient-text";
import { SpotlightCard } from "@/components/ui/spotlight";
import { Magnet } from "@/components/ui/magnet";
import { Particles } from "@/components/ui/aurora-background";
import { ClickSpark } from "@/components/ui/click-spark";
import { RotatingText } from "@/components/ui/rotating-text";
import { GlareHover } from "@/components/ui/glare-hover";

const GAME_MODES = [
  { id: "who_liked", title: "Kim Begenmiş?", icon: ThumbsUp, color: "from-red-500 to-rose-600", desc: "Videoyu beğenen" },
  { id: "who_subscribed", title: "Kim Abone?", icon: UserPlus, color: "from-orange-500 to-amber-600", desc: "Kanala abone olan" },
  { id: "oldest_like", title: "İlk Aşkım", icon: Heart, color: "from-pink-500 to-rose-600", desc: "En eski beğeni" },
  { id: "which_older", title: "Hangisi Eski?", icon: Clock, color: "from-blue-500 to-cyan-600", desc: "Daha eski video" },
  { id: "most_viewed", title: "En Çok İzlenen", icon: Eye, color: "from-emerald-500 to-green-600", desc: "Daha çok izlenmiş" },
  { id: "which_longer", title: "Hangisi Uzun?", icon: Timer, color: "from-purple-500 to-violet-600", desc: "Daha uzun video" },
  { id: "which_more_subs", title: "Daha Popüler?", icon: Users, color: "from-cyan-500 to-blue-600", desc: "Daha fazla abone" },
  { id: "which_more_videos", title: "Daha Emektar?", icon: Disc3, color: "from-amber-500 to-orange-600", desc: "Daha fazla video" },
];

const FEATURES = [
  { icon: Users, title: "2-12 Oyuncu", desc: "Arkadaşlarınla oyna" },
  { icon: Zap, title: "Yıldırım Turları", desc: "2x puan çarpanı" },
  { icon: Trophy, title: "Seri Bonus", desc: "+10 ekstra puan" },
  { icon: Play, title: "8 Oyun Modu", desc: "Farklı deneyimler" },
];

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [, setLocation] = useLocation();
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const y = useTransform(scrollYProgress, [0, 1], [0, -50]);

  const handleJoinRoom = () => {
    if (roomCode.trim()) {
      setLocation(`/oyun/${roomCode.trim().toUpperCase()}`);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-background relative overflow-x-hidden">
      {/* Aurora Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[120px]" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-[180px]" />
        <Particles count={30} />
      </div>

      {/* Header */}
      <header className="relative z-20 flex items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Logo height={56} />
        </motion.div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 px-4 pt-8 pb-16 md:pt-12 md:pb-24">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] backdrop-blur-xl border border-white/10 mb-8"
          >
            <SiYoutube className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Multiplayer YouTube Oyunu</span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-primary/20 text-primary">YENİ</span>
          </motion.div>

          {/* Main Title with SplitText + RotatingText */}
          <div className="mb-6">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black leading-tight">
              <SplitText 
                text="Arkadaşların" 
                className="justify-center mb-2"
                delay={0.03}
                duration={0.6}
              />
              <div className="flex items-center justify-center gap-3 flex-wrap">
                <SplitText 
                  text="Ne" 
                  className="justify-center"
                  delay={0.03}
                  duration={0.6}
                />
                <GradientText 
                  colors={["#dc2626", "#f97316", "#dc2626"]} 
                  className="text-4xl md:text-6xl lg:text-7xl font-black"
                >
                  <RotatingText 
                    texts={["İzliyor?", "Beğeniyor?", "Takip Ediyor?"]} 
                    interval={2500}
                    animationDuration={0.4}
                  />
                </GradientText>
              </div>
            </h1>
          </div>

          {/* Subtitle with BlurText */}
          <div className="mb-10">
            <BlurText
              text="YouTube hesabını bağla, arkadaşlarını davet et, tahmin et ve kazan!"
              className="text-base md:text-lg text-muted-foreground justify-center max-w-lg mx-auto"
              delay={80}
              animateBy="words"
            />
          </div>

          {/* Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.8 }}
            className="flex justify-center gap-8 md:gap-12 mb-12"
          >
            {[
              { value: "8", label: "Oyun Modu", color: "from-primary to-red-500" },
              { value: "12", label: "Max Oyuncu", color: "from-blue-400 to-cyan-500" },
              { value: "25", label: "Max Tur", color: "from-amber-400 to-orange-500" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div className={`text-3xl md:text-4xl font-black bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
                <div className="text-xs text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>

          {/* CTA Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 1 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <ClickSpark sparkColor="#dc2626" sparkCount={12}>
              <Magnet strength={0.15}>
                <Link href="/oda-olustur">
                  <Button
                    size="lg"
                    className="h-14 px-8 gap-3 text-lg font-bold bg-gradient-to-r from-primary to-red-600 border-0 shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-shadow"
                    data-testid="button-create-room"
                  >
                    <Plus className="h-5 w-5" />
                    Oda Oluştur
                  </Button>
                </Link>
              </Magnet>
            </ClickSpark>

            <div className="flex items-center gap-2">
              <Input
                placeholder="Kod"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleJoinRoom()}
                maxLength={6}
                className="w-24 h-14 text-center font-mono text-xl bg-white/[0.03] backdrop-blur-xl border-white/10"
                data-testid="input-room-code"
              />
              <Button
                onClick={handleJoinRoom}
                disabled={!roomCode.trim()}
                size="lg"
                variant="outline"
                className="h-14 px-6 gap-2 bg-white/[0.03] backdrop-blur-xl border-white/10"
                data-testid="button-join-room"
              >
                <ArrowRight className="h-5 w-5" />
                Katıl
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Game Modes Section */}
      <section className="relative z-10 px-4 py-16">
        <div className="max-w-5xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              <GradientText colors={["#ffffff", "#a1a1aa", "#ffffff"]}>8 Farklı Oyun Modu</GradientText>
            </h2>
            <p className="text-sm text-muted-foreground">Tahmin ve karşılaştırma modlarıyla eğlenceyi katla</p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {GAME_MODES.map((mode, i) => {
              const Icon = mode.icon;
              return (
                <motion.div
                  key={mode.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <GlareHover
                    className="h-full"
                    glareOpacity={0.2}
                    glareSize={150}
                  >
                    <SpotlightCard
                      className="p-4 rounded-xl bg-white/[0.02] backdrop-blur-sm border border-white/5 h-full"
                      spotlightColor="rgba(220, 38, 38, 0.1)"
                    >
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mode.color} flex items-center justify-center shadow-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold">{mode.title}</h3>
                          <p className="text-[10px] text-muted-foreground mt-0.5">{mode.desc}</p>
                        </div>
                      </div>
                    </SpotlightCard>
                  </GlareHover>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.9 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-4 rounded-xl bg-white/[0.02] backdrop-blur-sm border border-white/5 text-center"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold">{feature.title}</h3>
                  <p className="text-[10px] text-muted-foreground mt-1">{feature.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How to Play Section */}
      <section className="relative z-10 px-4 py-16">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-6 md:p-8 rounded-2xl bg-white/[0.02] backdrop-blur-xl border border-white/10"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <h2 className="text-xl font-bold">Nasıl Oynanır?</h2>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                { step: "1", title: "Oda Oluştur", desc: "6 haneli kod ile arkadaşlarını davet et" },
                { step: "2", title: "YouTube Bağla", desc: "Beğenilerin ve aboneliklerin oyuna eklenir" },
                { step: "3", title: "Tahmin Et!", desc: "Doğru cevapla +5, seri bonusu +10 puan" },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex gap-4"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                    {item.step}
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto"
        >
          <SpotlightCard
            className="p-8 md:p-10 rounded-2xl bg-gradient-to-br from-primary/10 to-red-500/5 border border-primary/20 text-center"
            spotlightColor="rgba(220, 38, 38, 0.2)"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              className="inline-block mb-4"
            >
              <SiYoutube className="h-12 w-12 text-primary" />
            </motion.div>
            <h3 className="text-2xl font-bold mb-3">Hemen Oynamaya Başla!</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Arkadaşlarını topla, YouTube hesabını bağla ve eğlenceli bir yarışmaya başla.
            </p>
            <Magnet strength={0.1}>
              <Link href="/oda-olustur">
                <Button
                  size="lg"
                  className="gap-2 bg-gradient-to-r from-primary to-red-600 border-0 shadow-lg shadow-primary/25"
                  data-testid="button-cta-create"
                >
                  <Plus className="h-5 w-5" />
                  Oda Oluştur
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </Link>
            </Magnet>
          </SpotlightCard>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 py-8 border-t border-white/5">
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
            <a 
              href="https://toov.com.tr" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="font-medium text-foreground hover:text-primary transition-colors"
              data-testid="link-developer"
            >
              TOOV
            </a>
            <span className="opacity-30">•</span>
            <a 
              href="https://youtube.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="flex items-center gap-1 hover:text-red-400 transition-colors"
              data-testid="link-youtube"
            >
              <SiYoutube className="h-3.5 w-3.5" />
              YouTube
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
