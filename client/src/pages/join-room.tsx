import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Loader2, Lock, Users, Zap, Timer, ArrowRight, Check, UserPlus } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
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
        title: "Katılım başarısız",
        description: error.message || "Odaya katılınamadı. Lütfen tekrar dene.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast({
        title: "İsim gerekli",
        description: "Lütfen oyunda görünecek ismini gir.",
        variant: "destructive",
      });
      return;
    }

    if (!consentGiven) {
      toast({
        title: "Onay gerekli",
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
        <div className="text-center">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Oda bilgileri yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (roomQuery.isError) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="flex items-center justify-center p-4 border-b border-border">
          <Logo height={56} />
        </header>
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-md overflow-visible">
            <CardContent className="p-8 text-center">
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-destructive/10 mb-4">
                <SiYoutube className="h-7 w-7 text-destructive" />
              </div>
              <h2 className="text-2xl font-bold mb-2">Oda Bulunamadı</h2>
              <p className="text-muted-foreground mb-6">
                "{roomCode}" kodlu bir oda bulunamadı. Lütfen oda kodunu kontrol et.
              </p>
              <Link href="/">
                <Button className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Ana Sayfaya Dön
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const room = roomQuery.data?.room;
  const requiresPassword = roomQuery.data?.requiresPassword;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <Logo height={48} />
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
              <UserPlus className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Odaya Katıl</h1>
            <p className="text-muted-foreground">
              Bilgilerini gir ve oyuna katıl.
            </p>
          </div>

          <Card className="overflow-visible mb-6">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                  <SiYoutube className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-bold truncate">{room?.name || "Oda"}</h2>
                  <p className="text-sm text-muted-foreground">
                    Oda Kodu: <span className="font-mono font-bold text-foreground">{roomCode}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{room?.maxPlayers} oyuncu</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Zap className="h-4 w-4" />
                  <span>{room?.totalRounds} tur</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Timer className="h-4 w-4" />
                  <span>{room?.roundDuration} saniye</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="overflow-visible">
              <CardContent className="p-5 md:p-6 space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-base font-semibold">Oyuncu Adın</Label>
                  <Input
                    id="displayName"
                    placeholder="Örnek: Ahmet"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={20}
                    className="h-12 text-base"
                    data-testid="input-display-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Bu isim diğer oyunculara gösterilecek.
                  </p>
                </div>

                {requiresPassword && (
                  <div className="space-y-2">
                    <Label htmlFor="roomPassword" className="text-base font-semibold flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Oda Şifresi
                    </Label>
                    <Input
                      id="roomPassword"
                      type="password"
                      placeholder="Şifreyi gir"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 text-base"
                      data-testid="input-room-password"
                    />
                    <p className="text-xs text-muted-foreground">
                      Bu oda şifre korumalı. Oda sahibinden şifreyi iste.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="overflow-visible">
              <CardContent className="p-5 md:p-6">
                <button
                  type="button"
                  onClick={() => setConsentGiven(!consentGiven)}
                  className={`flex items-start gap-4 w-full text-left p-4 rounded-xl transition-all ${
                    consentGiven
                      ? "bg-primary/10 border-2 border-primary/30"
                      : "bg-muted/30 border-2 border-transparent hover:border-border"
                  }`}
                  data-testid="checkbox-consent"
                >
                  <div className={`h-6 w-6 rounded-md flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                    consentGiven ? "bg-primary" : "bg-muted border-2 border-border"
                  }`}>
                    {consentGiven && <Check className="h-4 w-4 text-primary-foreground" />}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium mb-1 ${consentGiven ? "text-foreground" : "text-muted-foreground"}`}>
                      Veri Kullanım Onayı
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      YouTube hesabımdaki beğendiğim videoların ve abone olduğum kanalların bu oyunda kullanılmasını kabul ediyorum.
                    </p>
                  </div>
                </button>
              </CardContent>
            </Card>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold gap-3"
                size="lg"
                disabled={joinMutation.isPending || !consentGiven || !displayName.trim()}
                data-testid="button-join"
              >
                {joinMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Odaya katılınıyor...
                  </>
                ) : (
                  <>
                    Odaya Katıl
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Katıldıktan sonra lobide diğer oyuncuları bekleyeceksin.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
