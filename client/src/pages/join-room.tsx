import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Loader2, Lock, Users, Zap, Clock, ArrowRight, User } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { SpotlightCard } from "@/components/ui/spotlight-card";
import { AuroraBackground } from "@/components/ui/animated-background";
import type { Room } from "@shared/schema";

export default function JoinRoom() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomCode = params.code?.toUpperCase();

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");

  const roomQuery = useQuery<{ room: Room; requiresPassword: boolean }>({
    queryKey: ["/api/rooms", roomCode, "info"],
    queryFn: async () => {
      const response = await fetch(`/api/rooms/${roomCode}/info`);
      if (!response.ok) {
        throw new Error("Oda bulunamadı");
      }
      return response.json();
    },
    enabled: !!roomCode,
  });

  const joinMutation = useMutation({
    mutationFn: async (data: {
      displayName: string;
      password?: string;
    }) => {
      const response = await apiRequest("POST", `/api/rooms/${roomCode}/join`, data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("roomCode", roomCode!);
      setLocation(`/oyun/${roomCode}/lobi`);
    },
    onError: (error: Error) => {
      toast({
        title: "Katılım Başarısız",
        description: error.message || "Odaya katılınamadı. Lütfen tekrar dene.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast({
        title: "İsim Gerekli",
        description: "Lütfen oyunda görünecek ismini gir.",
        variant: "destructive",
      });
      return;
    }

    joinMutation.mutate({
      displayName: displayName.trim(),
      password: password || undefined,
    });
  };

  if (roomQuery.isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Oda yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (roomQuery.isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-2">
          <SiYoutube className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-bold">Oda Bulunamadı</h2>
        <p className="text-sm text-muted-foreground text-center">
          "<span className="font-mono font-bold text-foreground">{roomCode}</span>" kodlu bir oda bulunamadı.
        </p>
        <Link href="/">
          <Button size="sm" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Ana Sayfa
          </Button>
        </Link>
      </div>
    );
  }

  const room = roomQuery.data?.room;
  const requiresPassword = roomQuery.data?.requiresPassword;
  const isFormValid = displayName.trim() && (!requiresPassword || password.trim());

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex flex-col">
      <AuroraBackground />
      
      {/* Floating Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute w-72 h-72 rounded-full bg-primary/10 blur-3xl"
          animate={{ x: [0, 50, 0], y: [0, -30, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "10%", left: "10%" }}
        />
        <motion.div
          className="absolute w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl"
          animate={{ x: [0, -40, 0], y: [0, 40, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: "10%", right: "5%" }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between p-4">
        <Link href="/">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Logo height={32} />
        <div className="w-9" />
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md"
        >
          {/* Glass Card */}
          <div className="relative">
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-emerald-500/10 to-blue-500/20 rounded-3xl blur-xl opacity-50" />
            
            <SpotlightCard className="relative p-6 rounded-3xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-2xl">
              {/* Live Badge */}
              <motion.div 
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                className="flex items-center justify-center gap-2 mb-5"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
                <span className="text-xs text-emerald-400 font-semibold tracking-wide">Aktif Oda</span>
              </motion.div>

              {/* Room Name */}
              <motion.h1 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="text-2xl font-black text-center mb-2" 
                data-testid="text-room-name"
              >
                {room?.name || "Oda"}
              </motion.h1>

              {/* Room Code with 3D Flip */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="mb-4"
              >
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground text-center mb-2">Katılım Kodu</p>
                <div className="flex justify-center gap-1.5">
                  {roomCode?.split('').map((char, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, rotateY: 90, scale: 0.5 }}
                      animate={{ opacity: 1, rotateY: 0, scale: 1 }}
                      transition={{ delay: 0.25 + i * 0.06, type: "spring", stiffness: 200 }}
                      className="w-10 h-12 rounded-xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 flex items-center justify-center text-xl font-black shadow-lg"
                      style={{ perspective: "500px" }}
                    >
                      {char}
                    </motion.div>
                  ))}
                </div>
              </motion.div>

              {/* Room Stats */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="flex items-center justify-center gap-4 text-xs text-muted-foreground mb-6"
              >
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5">
                  <Users className="h-3.5 w-3.5 text-blue-400" />{room?.maxPlayers} Oyuncu
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5">
                  <Zap className="h-3.5 w-3.5 text-amber-400" />{room?.totalRounds} Tur
                </span>
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/5">
                  <Clock className="h-3.5 w-3.5 text-purple-400" />{room?.roundDuration}sn
                </span>
              </motion.div>

              {/* Separator */}
              <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-5" />

              {/* Join Form */}
              <form onSubmit={handleSubmit}>
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 }}
                  className="space-y-4"
                >
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block text-center">
                      Oyuncu Adın
                    </label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Adını gir..."
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={20}
                        className="h-12 pl-11 bg-white/5 border-white/10 text-center text-base placeholder:text-muted-foreground/50 focus:border-primary/50 focus:ring-primary/20"
                        data-testid="input-display-name"
                        autoFocus
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        {displayName.length}/20
                      </span>
                    </div>
                  </div>

                  {/* Password Field (if required) */}
                  <AnimatePresence>
                    {requiresPassword && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        <label className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 block text-center">
                          Oda Şifresi
                        </label>
                        <div className="relative">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            type="password"
                            placeholder="Şifreyi gir..."
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="h-12 pl-11 bg-white/5 border-white/10 text-center text-base placeholder:text-muted-foreground/50 focus:border-purple-500/50 focus:ring-purple-500/20"
                            data-testid="input-room-password"
                          />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  
                  <Button 
                    type="submit"
                    disabled={!isFormValid || joinMutation.isPending} 
                    className="w-full h-12 gap-2 text-base font-bold bg-gradient-to-r from-primary via-red-500 to-orange-500 border-0 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
                    data-testid="button-join"
                  >
                    {joinMutation.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        Odaya Katıl
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </motion.div>
              </form>
            </SpotlightCard>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
