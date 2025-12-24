import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
      setLocation(`/oyun/${roomCode}/lobby`);
    },
    onError: (error: Error) => {
      toast({
        title: "Katılım başarısız",
        description: error.message || "Odaya katılınamadı. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim()) {
      toast({
        title: "İsim gerekli",
        description: "Lütfen görüntülenecek isminizi girin.",
        variant: "destructive",
      });
      return;
    }

    if (!consentGiven) {
      toast({
        title: "Onay gerekli",
        description: "Devam etmek için veri kullanım onayı vermeniz gerekiyor.",
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
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
          <Card className="w-full max-w-md text-center p-8">
            <h2 className="text-2xl font-bold mb-4">Oda Bulunamadı</h2>
            <p className="text-muted-foreground mb-6">
              "{roomCode}" kodlu bir oda bulunamadı. Lütfen kodu kontrol edin.
            </p>
            <Link href="/">
              <Button>Ana Sayfaya Dön</Button>
            </Link>
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

      <main className="flex-1 flex items-center justify-center p-4 md:p-8">
        <Card className="w-full max-w-md animate-slide-up">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{room?.name || "Oda"}</CardTitle>
            <CardDescription>
              Oda Kodu: <span className="font-mono font-bold text-foreground">{roomCode}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="displayName">Görüntülenecek İsim</Label>
                <Input
                  id="displayName"
                  placeholder="İsminizi girin"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={20}
                  data-testid="input-display-name"
                />
              </div>

              {requiresPassword && (
                <div className="space-y-2">
                  <Label htmlFor="roomPassword" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Oda Şifresi
                  </Label>
                  <Input
                    id="roomPassword"
                    type="password"
                    placeholder="Şifreyi girin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="input-room-password"
                  />
                </div>
              )}

              <div className="flex items-start gap-3 p-4 rounded-lg border border-border">
                <Checkbox
                  id="consent"
                  checked={consentGiven}
                  onCheckedChange={(checked) => setConsentGiven(checked === true)}
                  className="mt-0.5"
                  data-testid="checkbox-consent"
                />
                <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                  Dinleme geçmişim ve playlist verilerimin bu oda oyununda kullanılacağını kabul ediyorum.
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={joinMutation.isPending || !consentGiven}
                data-testid="button-join"
              >
                {joinMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Katılınıyor...
                  </>
                ) : (
                  "Odaya Katıl"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
