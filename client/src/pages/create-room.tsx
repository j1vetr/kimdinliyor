import { useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Lock, Globe, Users, Loader2, Timer, Zap, ThumbsUp, UserPlus, Eye, Clock, Heart, Check, Play, Disc3, Sparkles } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import { SpotlightCard } from "@/components/ui/spotlight";
import { ClickSpark } from "@/components/ui/click-spark";
import { Particles } from "@/components/ui/aurora-background";

const COMPARE_MODES = [
  { id: "which_older", label: "Hangisi Eski?", icon: Clock, gradient: "from-blue-500/20 to-cyan-500/20", border: "border-blue-500/30", iconBg: "bg-blue-500" },
  { id: "most_viewed", label: "En Çok İzlenen", icon: Eye, gradient: "from-emerald-500/20 to-teal-500/20", border: "border-emerald-500/30", iconBg: "bg-emerald-500" },
  { id: "which_longer", label: "Hangisi Uzun?", icon: Timer, gradient: "from-purple-500/20 to-violet-500/20", border: "border-purple-500/30", iconBg: "bg-purple-500" },
  { id: "which_more_subs", label: "Daha Popüler?", icon: Users, gradient: "from-cyan-500/20 to-sky-500/20", border: "border-cyan-500/30", iconBg: "bg-cyan-500" },
  { id: "which_more_videos", label: "Daha Emektar?", icon: Disc3, gradient: "from-amber-500/20 to-orange-500/20", border: "border-amber-500/30", iconBg: "bg-amber-500" },
] as const;

const GUESS_MODES = [
  { id: "who_liked", label: "Kim Beğenmiş?", icon: ThumbsUp, gradient: "from-red-500/20 to-rose-500/20", border: "border-red-500/30", iconBg: "bg-red-500" },
  { id: "who_subscribed", label: "Kim Abone?", icon: UserPlus, gradient: "from-orange-500/20 to-amber-500/20", border: "border-orange-500/30", iconBg: "bg-orange-500" },
  { id: "oldest_like", label: "İlk Aşkım", icon: Heart, gradient: "from-pink-500/20 to-rose-500/20", border: "border-pink-500/30", iconBg: "bg-pink-500" },
] as const;

const PRESETS = [
  { id: "quick", label: "Hızlı", icon: Zap, rounds: 5, duration: 15, time: "~2 dk", color: "text-yellow-400" },
  { id: "normal", label: "Normal", icon: Play, rounds: 10, duration: 20, time: "~4 dk", color: "text-blue-400" },
  { id: "extended", label: "Maraton", icon: Timer, rounds: 20, duration: 30, time: "~12 dk", color: "text-purple-400" },
] as const;

export default function CreateRoom() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [totalRounds, setTotalRounds] = useState(10);
  const [roundDuration, setRoundDuration] = useState(20);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [gameModes, setGameModes] = useState<string[]>(["which_older", "most_viewed"]);
  const [selectedPreset, setSelectedPreset] = useState<string>("normal");

  const toggleMode = (modeId: string) => {
    if (gameModes.includes(modeId)) {
      if (gameModes.length === 1) {
        toast({ title: "En az bir mod seçili olmalı", variant: "destructive" });
        return;
      }
      setGameModes(gameModes.filter((id) => id !== modeId));
    } else {
      setGameModes([...gameModes, modeId]);
    }
  };

  const applyPreset = (presetId: string) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (preset) {
      setTotalRounds(preset.rounds);
      setRoundDuration(preset.duration);
      setSelectedPreset(presetId);
    }
  };

  const createRoomMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      maxPlayers: number;
      totalRounds: number;
      roundDuration: number;
      isPublic: boolean;
      password?: string;
      gameModes: string[];
    }) => {
      const response = await apiRequest("POST", "/api/rooms", data);
      return response.json();
    },
    onSuccess: (data) => {
      setLocation(`/oyun/${data.code}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Hata",
        description: error.message || "Oda oluşturulamadı.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomName.trim()) {
      toast({ title: "Oda adı gerekli", variant: "destructive" });
      return;
    }

    if (!isPublic && !password.trim()) {
      toast({ title: "Şifre gerekli", variant: "destructive" });
      return;
    }

    createRoomMutation.mutate({
      name: roomName.trim(),
      maxPlayers,
      totalRounds,
      roundDuration,
      isPublic,
      password: isPublic ? undefined : password,
      gameModes,
    });
  };

  const isFormValid = roomName.trim() && gameModes.length > 0 && (isPublic || password.trim());

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient Background with Particles */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-purple-500/10 rounded-full blur-[100px]" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-[150px]" />
        <Particles count={20} />
      </div>

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between p-4 border-b border-white/5 backdrop-blur-sm">
        <Link href="/">
          <Button variant="ghost" size="icon" className="text-muted-foreground" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Logo height={36} />
        <div className="w-9" />
      </header>

      {/* Main Content */}
      <main className="relative z-10 flex-1 overflow-auto pb-8">
        <form onSubmit={handleSubmit} className="max-w-lg mx-auto px-4 py-6 space-y-6">
          
          {/* Title */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-1"
          >
            <h1 className="text-2xl font-bold tracking-tight">Yeni Oda Oluştur</h1>
            <p className="text-sm text-muted-foreground">Arkadaşlarınla yarışmaya hazır mısın?</p>
          </motion.div>

          {/* Room Name - Glass Card with Spotlight */}
          <SpotlightCard
            className="relative p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-xl"
            spotlightColor="rgba(220, 38, 38, 0.08)"
          >
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 block">
              Oda Adı
            </label>
            <Input
              placeholder="Örn: Müzik Gecesi"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={30}
              className="h-12 text-base bg-white/5 border-white/10 focus:border-primary/50 focus:bg-white/10 transition-all placeholder:text-muted-foreground/50"
              data-testid="input-room-name"
            />
            <div className="absolute top-5 right-5 text-[10px] text-muted-foreground/50">
              {roomName.length}/30
            </div>
          </motion.div>
          </SpotlightCard>

          {/* Game Modes - Glass Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-xl space-y-5"
          >
            {/* Comparison Modes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-emerald-500/20 flex items-center justify-center">
                    <Globe className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                  <span className="text-sm font-semibold">Karşılaştırma</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                  YouTube Gerekmiyor
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {COMPARE_MODES.map((mode, i) => {
                  const Icon = mode.icon;
                  const isSelected = gameModes.includes(mode.id);
                  return (
                    <motion.button
                      key={mode.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.12 + i * 0.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleMode(mode.id)}
                      className={`relative flex items-center gap-2.5 p-3 rounded-xl transition-all duration-200 ${
                        isSelected
                          ? `bg-gradient-to-br ${mode.gradient} border ${mode.border} shadow-lg`
                          : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                      }`}
                      data-testid={`checkbox-mode-${mode.id}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                        isSelected ? mode.iconBg : "bg-white/10"
                      }`}>
                        <Icon className={`h-4 w-4 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`text-xs font-medium flex-1 text-left ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                        {mode.label}
                      </span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center"
                        >
                          <Check className="h-3 w-3 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Guess Modes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-red-500/20 flex items-center justify-center">
                    <SiYoutube className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <span className="text-sm font-semibold">Tahmin</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                  YouTube Gerekli
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {GUESS_MODES.map((mode, i) => {
                  const Icon = mode.icon;
                  const isSelected = gameModes.includes(mode.id);
                  return (
                    <motion.button
                      key={mode.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.25 + i * 0.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => toggleMode(mode.id)}
                      className={`relative flex flex-col items-center gap-2 p-3 rounded-xl transition-all duration-200 ${
                        isSelected
                          ? `bg-gradient-to-br ${mode.gradient} border ${mode.border} shadow-lg`
                          : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10"
                      }`}
                      data-testid={`checkbox-mode-${mode.id}`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all ${
                        isSelected ? mode.iconBg : "bg-white/10"
                      }`}>
                        <Icon className={`h-4.5 w-4.5 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <span className={`text-[11px] font-medium text-center leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                        {mode.label}
                      </span>
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center"
                        >
                          <Check className="h-2.5 w-2.5 text-white" />
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>
          </motion.div>

          {/* Game Settings - Glass Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-xl space-y-5"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-blue-500/20 flex items-center justify-center">
                  <Timer className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-sm font-semibold">Oyun Ayarları</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {totalRounds} tur • {roundDuration}sn
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = selectedPreset === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyPreset(preset.id)}
                    className={`relative flex flex-col items-center gap-1.5 py-4 rounded-xl transition-all ${
                      isSelected
                        ? "bg-white/10 border border-white/20 shadow-lg"
                        : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]"
                    }`}
                    data-testid={`preset-${preset.id}`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? preset.color : "text-muted-foreground"}`} />
                    <span className={`text-sm font-bold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                      {preset.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{preset.time}</span>
                    {isSelected && (
                      <motion.div
                        layoutId="preset-indicator"
                        className="absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-primary"
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Sliders */}
            <div className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5" /> Oyuncu
                  </span>
                  <span className="text-sm font-bold tabular-nums">{maxPlayers}</span>
                </div>
                <Slider
                  min={2} max={12} step={1}
                  value={[maxPlayers]}
                  onValueChange={(v) => setMaxPlayers(v[0])}
                  data-testid="slider-max-players"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3.5 w-3.5" /> Tur Sayısı
                  </span>
                  <span className="text-sm font-bold tabular-nums">{totalRounds}</span>
                </div>
                <Slider
                  min={3} max={25} step={1}
                  value={[totalRounds]}
                  onValueChange={(v) => { setTotalRounds(v[0]); setSelectedPreset(""); }}
                  data-testid="slider-rounds"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> Tur Süresi
                  </span>
                  <span className="text-sm font-bold tabular-nums">{roundDuration}sn</span>
                </div>
                <Slider
                  min={10} max={45} step={5}
                  value={[roundDuration]}
                  onValueChange={(v) => { setRoundDuration(v[0]); setSelectedPreset(""); }}
                  data-testid="slider-duration"
                />
              </div>
            </div>
          </motion.div>

          {/* Privacy - Glass Card */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 rounded-2xl bg-white/[0.03] backdrop-blur-xl border border-white/10 shadow-xl space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-violet-500/20 flex items-center justify-center">
                {isPublic ? <Globe className="h-3.5 w-3.5 text-violet-400" /> : <Lock className="h-3.5 w-3.5 text-violet-400" />}
              </div>
              <span className="text-sm font-semibold">Gizlilik</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all ${
                  isPublic
                    ? "bg-white/10 border border-white/20"
                    : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]"
                }`}
                data-testid="button-public"
              >
                <Globe className={`h-4 w-4 ${isPublic ? "text-emerald-400" : "text-muted-foreground"}`} />
                <span className={`font-medium ${isPublic ? "text-foreground" : "text-muted-foreground"}`}>Açık Oda</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex items-center justify-center gap-2 py-3.5 rounded-xl transition-all ${
                  !isPublic
                    ? "bg-white/10 border border-white/20"
                    : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]"
                }`}
                data-testid="button-private"
              >
                <Lock className={`h-4 w-4 ${!isPublic ? "text-amber-400" : "text-muted-foreground"}`} />
                <span className={`font-medium ${!isPublic ? "text-foreground" : "text-muted-foreground"}`}>Şifreli</span>
              </button>
            </div>

            {!isPublic && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
              >
                <Input
                  type="password"
                  placeholder="Şifre gir..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-white/5 border-white/10 focus:border-primary/50"
                  data-testid="input-password"
                />
              </motion.div>
            )}
          </motion.div>

          {/* Submit Button with ClickSpark */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <ClickSpark sparkColor="#dc2626" sparkCount={10}>
              <Button
                type="submit"
                size="lg"
                className="w-full h-14 gap-3 text-base font-bold bg-gradient-to-r from-primary via-primary to-red-500 hover:opacity-90 shadow-lg shadow-primary/25 transition-all"
                disabled={!isFormValid || createRoomMutation.isPending}
                data-testid="button-submit-room"
              >
                {createRoomMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Play className="h-5 w-5" />
                )}
                Oda Oluştur
              </Button>
            </ClickSpark>
          </motion.div>

        </form>
      </main>
    </div>
  );
}
