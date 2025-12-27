import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Lock, Globe, Users, Loader2, Timer, Zap, ThumbsUp, UserPlus, Eye, UsersRound, Check, ArrowRight, Play, Disc3, Radio } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

const GAME_MODE_OPTIONS = [
  { id: "who_liked", label: "Kim Beğenmiş?", description: "Videoyu hangi oyuncu beğenmiş?", icon: ThumbsUp, color: "bg-red-500", glow: "shadow-red-500/30" },
  { id: "who_subscribed", label: "Kim Abone?", description: "Kanala hangi oyuncu abone?", icon: UserPlus, color: "bg-orange-500", glow: "shadow-orange-500/30" },
  { id: "view_count", label: "Sayı Tahmini", description: "Videonun izlenme sayısını tahmin et.", icon: Eye, color: "bg-blue-500", glow: "shadow-blue-500/30" },
  { id: "subscriber_count", label: "Abone Sayısı", description: "Kanalın abone sayısını tahmin et.", icon: UsersRound, color: "bg-emerald-500", glow: "shadow-emerald-500/30" },
] as const;

const STEPS = [
  { id: 1, label: "İsim" },
  { id: 2, label: "Mod" },
  { id: 3, label: "Ayar" },
  { id: 4, label: "Gizlilik" },
];

export default function CreateRoom() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(1);
  const [pulseStep, setPulseStep] = useState(1);

  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [totalRounds, setTotalRounds] = useState(10);
  const [roundDuration, setRoundDuration] = useState(20);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");
  const [gameModes, setGameModes] = useState<string[]>(["who_liked", "who_subscribed"]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPulseStep((prev) => (prev % 4) + 1);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (roomName.trim()) setActiveStep(Math.max(activeStep, 2));
    if (gameModes.length > 0) setActiveStep(Math.max(activeStep, 3));
  }, [roomName, gameModes]);

  const toggleGameMode = (modeId: string) => {
    if (gameModes.includes(modeId)) {
      if (gameModes.length === 1) {
        toast({
          title: "En az bir mod seçili olmalı",
          description: "Oyun için en az bir oyun modu seçmelisin.",
          variant: "destructive",
        });
        return;
      }
      setGameModes(gameModes.filter((id) => id !== modeId));
    } else {
      setGameModes([...gameModes, modeId]);
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
        description: error.message || "Oda oluşturulamadı. Lütfen tekrar dene.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomName.trim()) {
      toast({
        title: "Oda adı gerekli",
        description: "Lütfen odan için bir ad gir.",
        variant: "destructive",
      });
      return;
    }

    if (!isPublic && !password.trim()) {
      toast({
        title: "Şifre gerekli",
        description: "Şifreli odalar için bir şifre belirlemelisin.",
        variant: "destructive",
      });
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

  const estimatedDuration = Math.ceil((totalRounds * roundDuration) / 60);
  const isFormValid = roomName.trim() && gameModes.length > 0 && (isPublic || password.trim());

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="relative flex items-center justify-center p-4 border-b border-border/50 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <Link href="/" className="absolute left-4">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Logo height={40} />
      </header>

      <main className="flex-1 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 left-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-40 right-10 w-48 h-48 rounded-full bg-purple-500 blur-3xl" />
        </div>

        <div className="relative max-w-4xl mx-auto px-4 py-6 lg:py-6">
          <div className="flex flex-col lg:flex-row gap-6">
            
            <div className="hidden lg:flex flex-col items-center gap-0 pt-8">
              {STEPS.map((step, i) => (
                <div key={step.id} className="flex flex-col items-center">
                  <motion.div
                    className={`relative h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-500 ${
                      activeStep >= step.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                    animate={{
                      scale: pulseStep === step.id ? [1, 1.1, 1] : 1,
                      boxShadow: pulseStep === step.id 
                        ? ["0 0 0 0 rgba(255,0,0,0)", "0 0 0 8px rgba(255,0,0,0.15)", "0 0 0 0 rgba(255,0,0,0)"]
                        : "none"
                    }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                  >
                    {activeStep > step.id ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.id
                    )}
                  </motion.div>
                  <span className={`text-[10px] mt-1.5 font-medium ${
                    activeStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {step.label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div className={`w-0.5 h-12 mt-1.5 transition-colors duration-500 ${
                      activeStep > step.id ? "bg-primary" : "bg-border"
                    }`} />
                  )}
                </div>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex-1 space-y-5 lg:space-y-6">
              
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full" />
                <div className="pl-3">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-lg bg-gradient-to-br from-primary to-red-600 flex items-center justify-center shadow-md shadow-primary/20">
                      <Radio className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Oda Adı</h2>
                      <p className="text-[10px] text-muted-foreground">Odanı Tanımlayan Kısa Bir Ad</p>
                    </div>
                  </div>
                  <div className="relative">
                    <Input
                      placeholder="Örnek: Müzik Gecesi"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      maxLength={30}
                      className="h-11 lg:h-10 text-sm lg:text-base pl-4 pr-16 bg-muted/30 border-border/50 focus:border-primary/50 focus:bg-muted/50 transition-all"
                      data-testid="input-room-name"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      {roomName.length}/30
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="relative"
              >
                <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-orange-500 via-orange-500/50 to-transparent rounded-full" />
                <div className="pl-3">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-lg bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-md shadow-orange-500/20">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Oyun Modları</h2>
                      <p className="text-[10px] text-muted-foreground">{gameModes.length} Mod Seçildi</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {GAME_MODE_OPTIONS.map((mode, i) => {
                      const Icon = mode.icon;
                      const isSelected = gameModes.includes(mode.id);
                      return (
                        <motion.button
                          key={mode.id}
                          type="button"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: 0.15 + i * 0.05 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleGameMode(mode.id);
                          }}
                          className={`group relative flex flex-col items-center p-3 lg:p-2.5 rounded-xl cursor-pointer transition-all duration-300 ${
                            isSelected
                              ? `bg-gradient-to-b from-muted to-muted/50 border-2 border-primary/40 shadow-md ${mode.glow}`
                              : "bg-muted/20 border-2 border-transparent hover:border-border/50 hover:bg-muted/40"
                          }`}
                          data-testid={`checkbox-mode-${mode.id}`}
                        >
                          <motion.div 
                            className={`relative h-10 w-10 lg:h-9 lg:w-9 rounded-lg flex items-center justify-center mb-2 transition-all ${
                              isSelected ? mode.color : "bg-muted"
                            }`}
                            animate={{ 
                              rotate: isSelected ? [0, -5, 5, 0] : 0,
                              scale: isSelected ? 1.05 : 1
                            }}
                            transition={{ duration: 0.3 }}
                          >
                            <Icon className={`h-5 w-5 lg:h-4 lg:w-4 ${isSelected ? "text-white" : "text-muted-foreground"}`} />
                            <AnimatePresence>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  exit={{ scale: 0 }}
                                  className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary flex items-center justify-center"
                                >
                                  <Check className="h-2.5 w-2.5 text-white" />
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                          <p className={`text-xs lg:text-[11px] font-semibold text-center ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {mode.label}
                          </p>
                          <p className="text-[9px] text-muted-foreground text-center mt-0.5 leading-tight hidden sm:block">
                            {mode.description}
                          </p>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500 via-blue-500/50 to-transparent rounded-full" />
                <div className="pl-3">
                  <div className="flex items-center gap-2.5 mb-4">
                    <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md shadow-blue-500/20">
                      <Timer className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Oyun Ayarları</h2>
                      <p className="text-[10px] text-muted-foreground">Süre ve Tur Sayısını Belirle</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                    <div className="relative p-4 lg:p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">Oyuncu</span>
                        </div>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-2xl lg:text-xl font-bold text-primary">{maxPlayers}</span>
                          <span className="text-[10px] text-muted-foreground">kişi</span>
                        </div>
                      </div>
                      <Slider
                        min={2}
                        max={12}
                        step={1}
                        value={[maxPlayers]}
                        onValueChange={(value) => setMaxPlayers(value[0])}
                        className="w-full"
                        data-testid="slider-max-players"
                      />
                      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
                        <span>2</span>
                        <span>12</span>
                      </div>
                    </div>

                    <div className="relative p-4 lg:p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">Tur</span>
                        </div>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-2xl lg:text-xl font-bold text-primary">{totalRounds}</span>
                          <span className="text-[10px] text-muted-foreground">tur</span>
                        </div>
                      </div>
                      <Slider
                        min={2}
                        max={15}
                        step={1}
                        value={[totalRounds]}
                        onValueChange={(value) => setTotalRounds(value[0])}
                        className="w-full"
                        data-testid="slider-total-rounds"
                      />
                      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
                        <span>2</span>
                        <span>15</span>
                      </div>
                    </div>

                    <div className="relative p-4 lg:p-3 rounded-xl bg-gradient-to-br from-muted/50 to-muted/20 border border-border/30">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs font-medium">Süre</span>
                        </div>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-2xl lg:text-xl font-bold text-primary">{roundDuration}</span>
                          <span className="text-[10px] text-muted-foreground">sn</span>
                        </div>
                      </div>
                      <Slider
                        min={10}
                        max={30}
                        step={5}
                        value={[roundDuration]}
                        onValueChange={(value) => setRoundDuration(value[0])}
                        className="w-full"
                        data-testid="slider-round-duration"
                      />
                      <div className="flex justify-between mt-1.5 text-[9px] text-muted-foreground">
                        <span>10</span>
                        <span>30</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative"
              >
                <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-gradient-to-b from-purple-500 via-purple-500/50 to-transparent rounded-full" />
                <div className="pl-3">
                  <div className="flex items-center gap-2.5 mb-3">
                    <div className="h-8 w-8 lg:h-9 lg:w-9 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-md shadow-purple-500/20">
                      {isPublic ? <Globe className="h-4 w-4 text-white" /> : <Lock className="h-4 w-4 text-white" />}
                    </div>
                    <div>
                      <h2 className="text-base font-bold">Oda Gizliliği</h2>
                      <p className="text-[10px] text-muted-foreground">{isPublic ? "Herkese açık" : "Şifre korumalı"}</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={() => setIsPublic(true)}
                      className={`flex-1 flex items-center gap-2.5 p-3 lg:p-2.5 rounded-xl transition-all ${
                        isPublic
                          ? "bg-gradient-to-br from-primary/20 to-primary/5 border-2 border-primary/40"
                          : "bg-muted/20 border-2 border-transparent hover:border-border/50"
                      }`}
                      data-testid="button-public"
                    >
                      <div className={`h-7 w-7 lg:h-8 lg:w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isPublic ? "bg-primary" : "bg-muted"
                      }`}>
                        <Globe className={`h-3.5 w-3.5 lg:h-4 lg:w-4 ${isPublic ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs lg:text-sm font-semibold ${isPublic ? "text-foreground" : "text-muted-foreground"}`}>
                          Herkese Açık
                        </p>
                        <p className="text-[9px] lg:text-[10px] text-muted-foreground">Kod Bilen Katılır</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPublic(false)}
                      className={`flex-1 flex items-center gap-2.5 p-3 lg:p-2.5 rounded-xl transition-all ${
                        !isPublic
                          ? "bg-gradient-to-br from-purple-500/20 to-purple-500/5 border-2 border-purple-500/40"
                          : "bg-muted/20 border-2 border-transparent hover:border-border/50"
                      }`}
                      data-testid="button-private"
                    >
                      <div className={`h-7 w-7 lg:h-8 lg:w-8 rounded-lg flex items-center justify-center shrink-0 ${
                        !isPublic ? "bg-purple-500" : "bg-muted"
                      }`}>
                        <Lock className={`h-3.5 w-3.5 lg:h-4 lg:w-4 ${!isPublic ? "text-white" : "text-muted-foreground"}`} />
                      </div>
                      <div className="text-left">
                        <p className={`text-xs lg:text-sm font-semibold ${!isPublic ? "text-foreground" : "text-muted-foreground"}`}>
                          Şifreli
                        </p>
                        <p className="text-[9px] lg:text-[10px] text-muted-foreground">Şifre Gerekli</p>
                      </div>
                    </button>
                  </div>

                  <AnimatePresence>
                    {!isPublic && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 overflow-hidden"
                      >
                        <Input
                          type="password"
                          placeholder="Oda şifresini gir"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          className="h-10 bg-muted/30 border-border/50"
                          data-testid="input-password"
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="relative pt-4"
              >
                <div className="flex flex-col sm:flex-row items-center gap-3 p-4 lg:p-3 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="h-10 w-10 lg:h-9 lg:w-9 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Play className="h-5 w-5 lg:h-4 lg:w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Tahmini Süre</p>
                      <p className="text-xl lg:text-lg font-bold">{estimatedDuration} <span className="text-xs font-normal text-muted-foreground">dk</span></p>
                    </div>
                    <div className="h-6 w-px bg-border/50 hidden sm:block" />
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">Mod</p>
                      <p className="text-base lg:text-sm font-bold">{gameModes.length}</p>
                    </div>
                    <div className="h-6 w-px bg-border/50 hidden sm:block" />
                    <div className="hidden sm:block">
                      <p className="text-xs text-muted-foreground">Oyuncu</p>
                      <p className="text-base lg:text-sm font-bold">{maxPlayers}</p>
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    className="w-full sm:w-auto min-w-[140px] lg:min-w-[120px] h-10 lg:h-9 text-sm font-semibold gap-2 shadow-md shadow-primary/20"
                    disabled={createRoomMutation.isPending || !isFormValid}
                    data-testid="button-create-room"
                  >
                    {createRoomMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Oluşturuluyor...
                      </>
                    ) : (
                      <>
                        Odayı Oluştur
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </form>

            <div className="hidden xl:block w-56 pt-8">
              <div className="sticky top-20">
                <div className="relative p-4 rounded-xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/30 overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="relative">
                    <div className="flex items-center gap-2 mb-4">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                        className="h-8 w-8 rounded-full bg-gradient-to-r from-primary to-red-600 flex items-center justify-center"
                      >
                        <Disc3 className="h-4 w-4 text-white" />
                      </motion.div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">Önizleme</p>
                        <p className="text-sm font-bold truncate max-w-[140px]">
                          {roomName || "Oda Adı"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Oyuncu</span>
                        <span className="font-semibold">{maxPlayers} kişi</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tur</span>
                        <span className="font-semibold">{totalRounds} tur</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Süre</span>
                        <span className="font-semibold">{roundDuration} sn</span>
                      </div>
                      <div className="h-px bg-border/50" />
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Durum</span>
                        <div className="flex items-center gap-1">
                          {isPublic ? (
                            <>
                              <Globe className="h-3 w-3 text-emerald-500" />
                              <span className="font-semibold text-emerald-500">Açık</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3 w-3 text-purple-500" />
                              <span className="font-semibold text-purple-500">Şifreli</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/30">
                      <p className="text-[10px] text-muted-foreground mb-2">Seçili Modlar</p>
                      <div className="flex flex-wrap gap-1.5">
                        {gameModes.map((modeId) => {
                          const mode = GAME_MODE_OPTIONS.find((m) => m.id === modeId);
                          if (!mode) return null;
                          const Icon = mode.icon;
                          return (
                            <div
                              key={modeId}
                              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${mode.color} text-white text-[10px] font-medium`}
                            >
                              <Icon className="h-2.5 w-2.5" />
                              <span>{mode.label.split("?")[0]}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
