import { useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Lock, Globe, Users, Loader2, Timer, Zap, ThumbsUp, UserPlus, Eye, UsersRound, Check } from "lucide-react";
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

const GAME_MODE_OPTIONS = [
  { id: "who_liked", label: "Kim Beğenmiş?", description: "Bu videoyu kim beğendi?", icon: ThumbsUp, enabled: true },
  { id: "who_subscribed", label: "Kim Abone?", description: "Bu kanala kim abone?", icon: UserPlus, enabled: true },
  { id: "view_count", label: "Sayı Tahmini", description: "İzlenme sayısını tahmin et", icon: Eye, enabled: true },
  { id: "subscriber_count", label: "Abone Sayısı", description: "Abone sayısını tahmin et", icon: UsersRound, enabled: true },
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

  const toggleGameMode = (modeId: string) => {
    if (gameModes.includes(modeId)) {
      if (gameModes.length === 1) {
        toast({
          title: "En az bir mod seçili olmalı",
          description: "Oyun için en az bir oyun modu seçmeniz gerekiyor.",
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
      gameModes,
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

              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Oyun Modları
                </Label>
                <div className="space-y-2">
                  {GAME_MODE_OPTIONS.map((mode) => {
                    const Icon = mode.icon;
                    const isSelected = gameModes.includes(mode.id);
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          toggleGameMode(mode.id);
                        }}
                        className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all w-full text-left ${
                          isSelected
                            ? "bg-primary/10 border border-primary/30"
                            : "bg-muted/50 border border-transparent hover-elevate"
                        }`}
                        data-testid={`checkbox-mode-${mode.id}`}
                      >
                        <div className={`h-4 w-4 shrink-0 rounded-sm border ${isSelected ? "bg-primary border-primary" : "border-primary"} flex items-center justify-center`}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <Icon className={`h-4 w-4 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                            {mode.label}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {mode.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  Seçili modlar rastgele oynanır ({gameModes.length} seçili)
                </p>
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
