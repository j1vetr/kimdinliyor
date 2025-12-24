import { useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Lock, Globe, Users, Loader2, Timer, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function CreateRoom() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [roomName, setRoomName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [totalRounds, setTotalRounds] = useState(10);
  const [roundDuration, setRoundDuration] = useState(20);
  const [isPublic, setIsPublic] = useState(true);
  const [password, setPassword] = useState("");

  const createRoomMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      maxPlayers: number;
      totalRounds: number;
      roundDuration: number;
      isPublic: boolean;
      password?: string;
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
        description: error.message || "Oda oluşturulamadı. Lütfen tekrar deneyin.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!roomName.trim()) {
      toast({
        title: "Oda adı gerekli",
        description: "Lütfen odanız için bir isim girin.",
        variant: "destructive",
      });
      return;
    }

    if (!isPublic && !password.trim()) {
      toast({
        title: "Şifre gerekli",
        description: "Özel odalar için şifre belirlemeniz gerekiyor.",
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
    });
  };

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
          <CardHeader>
            <CardTitle className="text-2xl text-center">Yeni Oda Oluştur</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="roomName">Oda Adı</Label>
                <Input
                  id="roomName"
                  placeholder="Müzik Gecesi"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={30}
                  data-testid="input-room-name"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="maxPlayers" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Maksimum Oyuncu: {maxPlayers}
                  </Label>
                </div>
                <Slider
                  id="maxPlayers"
                  min={2}
                  max={12}
                  step={1}
                  value={[maxPlayers]}
                  onValueChange={(value) => setMaxPlayers(value[0])}
                  className="w-full"
                  data-testid="slider-max-players"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2</span>
                  <span>12</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="totalRounds" className="flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Tur Sayısı: {totalRounds}
                  </Label>
                </div>
                <Slider
                  id="totalRounds"
                  min={2}
                  max={15}
                  step={1}
                  value={[totalRounds]}
                  onValueChange={(value) => setTotalRounds(value[0])}
                  className="w-full"
                  data-testid="slider-total-rounds"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>2</span>
                  <span>15</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="roundDuration" className="flex items-center gap-2">
                    <Timer className="h-4 w-4" />
                    Tur Süresi: {roundDuration} saniye
                  </Label>
                </div>
                <Slider
                  id="roundDuration"
                  min={10}
                  max={30}
                  step={5}
                  value={[roundDuration]}
                  onValueChange={(value) => setRoundDuration(value[0])}
                  className="w-full"
                  data-testid="slider-round-duration"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10s</span>
                  <span>30s</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    {isPublic ? (
                      <Globe className="h-5 w-5 text-primary" />
                    ) : (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                    <div>
                      <p className="font-medium">
                        {isPublic ? "Herkese Açık" : "Şifreli Oda"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPublic
                          ? "Herkes oda kodunu bilerek katılabilir"
                          : "Katılmak için şifre gerekli"}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isPublic}
                    onCheckedChange={setIsPublic}
                    data-testid="switch-public"
                  />
                </div>

                {!isPublic && (
                  <div className="space-y-2 animate-slide-up">
                    <Label htmlFor="password">Oda Şifresi</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Şifre girin"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      data-testid="input-password"
                    />
                  </div>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={createRoomMutation.isPending}
                data-testid="button-create-room"
              >
                {createRoomMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Oluşturuluyor...
                  </>
                ) : (
                  "Oda Oluştur"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
