import { useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Lock, Globe, Users, Loader2, Timer, Zap, ThumbsUp, UserPlus, Eye, Clock, Heart, Check, Play, Disc3 } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";

const GUESS_MODES = [
  { id: "who_liked", label: "Kim Beğenmiş?", icon: ThumbsUp },
  { id: "who_subscribed", label: "Kim Abone?", icon: UserPlus },
  { id: "oldest_like", label: "İlk Aşkım", icon: Heart },
] as const;

const COMPARE_MODES = [
  { id: "which_older", label: "Hangisi Eski?", icon: Clock },
  { id: "most_viewed", label: "En Çok İzlenen", icon: Eye },
  { id: "which_longer", label: "Hangisi Uzun?", icon: Timer },
  { id: "which_more_subs", label: "Daha Popüler?", icon: Users },
  { id: "which_more_videos", label: "Daha Emektar?", icon: Disc3 },
] as const;

const PRESETS = [
  { id: "quick", label: "Hızlı", rounds: 5, duration: 15, time: "~2 dk" },
  { id: "normal", label: "Normal", rounds: 10, duration: 20, time: "~4 dk" },
  { id: "extended", label: "Uzun", rounds: 20, duration: 30, time: "~12 dk" },
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
  const [gameModes, setGameModes] = useState<string[]>(["who_liked", "who_subscribed"]);
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
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border/30">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Logo height={36} />
        <div className="w-9" />
      </header>

      <main className="flex-1 overflow-auto">
        <form onSubmit={handleSubmit} className="max-w-md mx-auto px-4 py-6 space-y-8">
          
          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <label className="text-sm font-semibold text-foreground">Oda Adı</label>
            <Input
              placeholder="Örn: Müzik Gecesi"
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
              maxLength={30}
              className="bg-muted/30 border-border/50"
              data-testid="input-room-name"
            />
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="space-y-4"
          >
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <SiYoutube className="h-4 w-4 text-red-500" />
                <span className="text-sm font-semibold">Tahmin Modları</span>
                <span className="text-[10px] text-muted-foreground">(YouTube gerekli)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {GUESS_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = gameModes.includes(mode.id);
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => toggleMode(mode.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                      }`}
                      data-testid={`checkbox-mode-${mode.id}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{mode.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold">Karşılaştırma Modları</span>
                <span className="text-[10px] text-muted-foreground">(Giriş gereksiz)</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {COMPARE_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const isSelected = gameModes.includes(mode.id);
                  return (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => toggleMode(mode.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground hover:bg-muted/60"
                      }`}
                      data-testid={`checkbox-mode-${mode.id}`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{mode.label}</span>
                      {isSelected && <Check className="h-3.5 w-3.5 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Oyun Süresi</span>
              <span className="text-xs text-muted-foreground">{totalRounds} tur, {roundDuration} sn</span>
            </div>
            
            <div className="grid grid-cols-3 gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`flex flex-col items-center py-3 rounded-lg transition-all ${
                    selectedPreset === preset.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/30 text-foreground hover:bg-muted/50"
                  }`}
                  data-testid={`preset-${preset.id}`}
                >
                  <span className="text-sm font-bold">{preset.label}</span>
                  <span className={`text-xs ${selectedPreset === preset.id ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {preset.time}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Oyuncu Sayısı</span>
                  <span className="font-semibold">{maxPlayers} kişi</span>
                </div>
                <Slider
                  min={2}
                  max={10}
                  step={1}
                  value={[maxPlayers]}
                  onValueChange={(value) => setMaxPlayers(value[0])}
                  data-testid="slider-max-players"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tur Sayısı</span>
                  <span className="font-semibold">{totalRounds} tur</span>
                </div>
                <Slider
                  min={3}
                  max={25}
                  step={1}
                  value={[totalRounds]}
                  onValueChange={(value) => {
                    setTotalRounds(value[0]);
                    setSelectedPreset("");
                  }}
                  data-testid="slider-rounds"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tur Süresi</span>
                  <span className="font-semibold">{roundDuration} saniye</span>
                </div>
                <Slider
                  min={10}
                  max={45}
                  step={5}
                  value={[roundDuration]}
                  onValueChange={(value) => {
                    setRoundDuration(value[0]);
                    setSelectedPreset("");
                  }}
                  data-testid="slider-duration"
                />
              </div>
            </div>
          </motion.section>

          <motion.section 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-3"
          >
            <span className="text-sm font-semibold">Gizlilik</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsPublic(true)}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                  isPublic
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-foreground hover:bg-muted/50"
                }`}
                data-testid="button-public"
              >
                <Globe className="h-4 w-4" />
                <span className="font-medium">Açık</span>
              </button>
              <button
                type="button"
                onClick={() => setIsPublic(false)}
                className={`flex items-center justify-center gap-2 py-3 rounded-lg transition-all ${
                  !isPublic
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/30 text-foreground hover:bg-muted/50"
                }`}
                data-testid="button-private"
              >
                <Lock className="h-4 w-4" />
                <span className="font-medium">Şifreli</span>
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
                  className="bg-muted/30 border-border/50"
                  data-testid="input-password"
                />
              </motion.div>
            )}
          </motion.section>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="pt-4"
          >
            <Button
              type="submit"
              size="lg"
              className="w-full gap-2 font-bold"
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
          </motion.div>

        </form>
      </main>
    </div>
  );
}
