import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Loader2, Lock, Users, Zap, Timer, ArrowRight, Check, UserPlus, Radio, Mic2, Shield } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import type { Room } from "@shared/schema";

export default function JoinRoom() {
  const params = useParams<{ code: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const roomCode = params.code?.toUpperCase();

  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [consentGiven, setConsentGiven] = useState(false);

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

    if (!consentGiven) {
      toast({
        title: "Onay Gerekli",
        description: "Devam etmek için veri kullanım onayını vermen gerekiyor.",
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
          <div className="relative">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="h-16 w-16 rounded-full border-4 border-primary/20 border-t-primary mx-auto"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Radio className="h-6 w-6 text-primary" />
            </div>
          </div>
          <p className="text-muted-foreground mt-4">Oda Bilgileri Yükleniyor...</p>
        </motion.div>
      </div>
    );
  }

  if (roomQuery.isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-center p-4 border-b border-border/50">
          <Logo height={48} />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md"
          >
            <div className="relative inline-block mb-6">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center">
                <SiYoutube className="h-10 w-10 text-destructive" />
              </div>
              <div className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-destructive flex items-center justify-center">
                <span className="text-white text-xs font-bold">!</span>
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">Oda Bulunamadı</h2>
            <p className="text-muted-foreground mb-6">
              "<span className="font-mono font-bold text-foreground">{roomCode}</span>" kodlu bir oda bulunamadı.
            </p>
            <Link href="/">
              <Button className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Ana Sayfaya Dön
              </Button>
            </Link>
          </motion.div>
        </main>
      </div>
    );
  }

  const room = roomQuery.data?.room;
  const requiresPassword = roomQuery.data?.requiresPassword;
  const isFormValid = displayName.trim() && consentGiven && (!requiresPassword || password.trim());

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

      <main className="flex-1 relative overflow-hidden flex items-start lg:items-center justify-center">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-20 right-10 w-64 h-64 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-20 left-10 w-48 h-48 rounded-full bg-emerald-500 blur-3xl" />
        </div>

        <div className="relative w-full max-w-3xl mx-auto px-4 py-6 lg:py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            
            <form onSubmit={handleSubmit} className="flex-1 space-y-6">
              
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative"
              >
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-primary via-primary/50 to-transparent rounded-full" />
                <div className="pl-4">
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
                    <div className="flex items-center gap-4">
                      <motion.div 
                        animate={{ 
                          boxShadow: ["0 0 0 0 rgba(255,0,0,0)", "0 0 0 8px rgba(255,0,0,0.1)", "0 0 0 0 rgba(255,0,0,0)"]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary to-red-600 flex items-center justify-center shadow-lg shadow-primary/30"
                      >
                        <SiYoutube className="h-7 w-7 text-white" />
                      </motion.div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-primary font-medium mb-1">Aktif Oda</p>
                        <h2 className="text-xl font-bold truncate">{room?.name || "Oda"}</h2>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground mb-1">Katılım Kodu</p>
                        <div className="flex gap-1">
                          {roomCode?.split("").map((char, i) => (
                            <motion.div
                              key={i}
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="h-8 w-7 rounded-md bg-muted flex items-center justify-center font-mono font-bold text-lg"
                            >
                              {char}
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4 mt-4 pt-4 border-t border-primary/10">
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                        <Users className="h-3.5 w-3.5 text-primary" />
                        <span className="text-xs font-medium">{room?.maxPlayers} Oyuncu</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                        <Zap className="h-3.5 w-3.5 text-amber-500" />
                        <span className="text-xs font-medium">{room?.totalRounds} Tur</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50">
                        <Timer className="h-3.5 w-3.5 text-blue-500" />
                        <span className="text-xs font-medium">{room?.roundDuration} Saniye</span>
                      </div>
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
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-500 via-emerald-500/50 to-transparent rounded-full" />
                <div className="pl-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
                      <Mic2 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Oyuncu Adın</h2>
                      <p className="text-xs text-muted-foreground">Diğer Oyunculara Görünecek İsim</p>
                    </div>
                  </div>
                  
                  <div className="relative">
                    <Input
                      placeholder="Örnek: Ahmet"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      maxLength={20}
                      className="h-14 text-lg pl-5 pr-20 bg-muted/30 border-border/50 focus:border-emerald-500/50 focus:bg-muted/50 transition-all"
                      data-testid="input-display-name"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ 
                              height: displayName.length > 0 ? [8, 16, 8] : 8,
                              opacity: displayName.length > 0 ? 1 : 0.3
                            }}
                            transition={{ 
                              duration: 0.5, 
                              repeat: displayName.length > 0 ? Infinity : 0,
                              delay: i * 0.1 
                            }}
                            className="w-1 rounded-full bg-emerald-500"
                            style={{ height: 8 }}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">{displayName.length}/20</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <AnimatePresence>
                {requiresPassword && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="relative overflow-hidden"
                  >
                    <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-purple-500 via-purple-500/50 to-transparent rounded-full" />
                    <div className="pl-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
                          <Lock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h2 className="text-lg font-bold">Oda Şifresi</h2>
                          <p className="text-xs text-muted-foreground">Bu Oda Şifre Korumalı</p>
                        </div>
                      </div>
                      
                      <Input
                        type="password"
                        placeholder="Şifreyi Gir"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="h-14 text-lg pl-5 bg-muted/30 border-border/50 focus:border-purple-500/50 focus:bg-muted/50 transition-all"
                        data-testid="input-room-password"
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="relative"
              >
                <div className="absolute -left-4 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-500 via-amber-500/50 to-transparent rounded-full" />
                <div className="pl-4">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
                      <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold">Veri Kullanım Onayı</h2>
                      <p className="text-xs text-muted-foreground">YouTube Verilerinin Kullanımı</p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setConsentGiven(!consentGiven)}
                    className={`w-full flex items-start gap-4 p-4 rounded-2xl transition-all text-left ${
                      consentGiven
                        ? "bg-gradient-to-br from-amber-500/15 to-amber-500/5 border-2 border-amber-500/30"
                        : "bg-muted/20 border-2 border-transparent hover:border-border/50"
                    }`}
                    data-testid="checkbox-consent"
                  >
                    <motion.div 
                      animate={{ scale: consentGiven ? [1, 1.2, 1] : 1 }}
                      className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 transition-all ${
                        consentGiven ? "bg-amber-500" : "bg-muted border-2 border-border"
                      }`}
                    >
                      {consentGiven && <Check className="h-4 w-4 text-white" />}
                    </motion.div>
                    <div className="flex-1">
                      <p className={`text-sm font-semibold mb-1 ${consentGiven ? "text-foreground" : "text-muted-foreground"}`}>
                        Kabul Ediyorum
                      </p>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        YouTube hesabımdaki beğendiğim videoların ve abone olduğum kanalların bu oyunda kullanılmasını kabul ediyorum.
                      </p>
                    </div>
                  </button>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="relative pt-4"
              >
                <div className="flex flex-col sm:flex-row items-center gap-4 p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <UserPlus className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Katılmaya Hazır</p>
                      <p className="text-lg font-bold">{room?.name}</p>
                    </div>
                  </div>
                  
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full sm:w-auto min-w-[160px] h-12 text-base font-semibold gap-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/25"
                    disabled={joinMutation.isPending || !isFormValid}
                    data-testid="button-join"
                  >
                    {joinMutation.isPending ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Katılınıyor...
                      </>
                    ) : (
                      <>
                        Odaya Katıl
                        <ArrowRight className="h-5 w-5" />
                      </>
                    )}
                  </Button>
                </div>
              </motion.div>
            </form>

            <div className="hidden lg:block w-72">
              <div className="sticky top-24">
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="relative p-6 rounded-2xl bg-gradient-to-b from-muted/50 to-muted/20 border border-border/30 overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                  
                  <div className="relative">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="relative">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 flex items-center justify-center">
                          <Radio className="h-6 w-6 text-white" />
                        </div>
                        <motion.div
                          animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="absolute inset-0 rounded-full border-2 border-emerald-500"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-emerald-500 font-medium">Aktif</p>
                        <p className="font-bold">Lobi Bekliyor</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-muted/30">
                        <p className="text-xs text-muted-foreground mb-2">Katılım Durumu</p>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${displayName.trim() ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                            <span className={`text-sm ${displayName.trim() ? "text-foreground" : "text-muted-foreground"}`}>
                              İsim Girildi
                            </span>
                          </div>
                          {requiresPassword && (
                            <div className="flex items-center gap-2">
                              <div className={`h-2 w-2 rounded-full ${password.trim() ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                              <span className={`text-sm ${password.trim() ? "text-foreground" : "text-muted-foreground"}`}>
                                Şifre Girildi
                              </span>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${consentGiven ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                            <span className={`text-sm ${consentGiven ? "text-foreground" : "text-muted-foreground"}`}>
                              Onay Verildi
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="h-px bg-border/50" />

                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-2">Oyuncu Adın</p>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
                          <p className="font-bold text-lg truncate">
                            {displayName || "..."}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
