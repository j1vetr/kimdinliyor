import { useState } from "react";
import { useLocation, Link } from "wouter";
import { ArrowLeft, Lock, Globe, Users, Loader2, Timer, Zap, ThumbsUp, UserPlus, Eye, UsersRound, Check, ArrowRight, Play } from "lucide-react";
import { SiYoutube } from "react-icons/si";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Logo } from "@/components/logo";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

const GAME_MODE_OPTIONS = [
  { id: "who_liked", label: "Kim Beğenmiş?", description: "Videoyu hangi oyuncu beğenmiş?", icon: ThumbsUp, color: "from-red-500/20 to-red-600/10", iconColor: "text-red-500" },
  { id: "who_subscribed", label: "Kim Abone?", description: "Kanala hangi oyuncu abone?", icon: UserPlus, color: "from-orange-500/20 to-orange-600/10", iconColor: "text-orange-500" },
  { id: "view_count", label: "Sayı Tahmini", description: "Videonun izlenme sayısını tahmin et.", icon: Eye, color: "from-blue-500/20 to-blue-600/10", iconColor: "text-blue-500" },
  { id: "subscriber_count", label: "Abone Sayısı", description: "Kanalın abone sayısını tahmin et.", icon: UsersRound, color: "from-green-500/20 to-green-600/10", iconColor: "text-green-500" },
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="relative flex items-center justify-center p-4 border-b border-border">
        <Link href="/" className="absolute left-4">
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <Logo height={48} />
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-primary/10 mb-4">
              <SiYoutube className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Yeni Oda Oluştur</h1>
            <p className="text-muted-foreground">
              Odanı özelleştir ve arkadaşlarınla oynamaya başla.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="overflow-visible">
              <CardContent className="p-5 md:p-6">
                <div className="space-y-2">
                  <Label htmlFor="roomName" className="text-base font-semibold">Oda Adı</Label>
                  <Input
                    id="roomName"
                    placeholder="Örnek: Müzik Gecesi"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    maxLength={30}
                    className="h-12 text-base"
                    data-testid="input-room-name"
                  />
                  <p className="text-xs text-muted-foreground">
                    Odanı tanımlayan kısa bir ad gir.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-visible">
              <CardContent className="p-5 md:p-6 space-y-6">
                <div>
                  <h3 className="text-base font-semibold flex items-center gap-2 mb-4">
                    <Zap className="h-5 w-5 text-primary" />
                    Oyun Modları
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                          className={`relative flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all text-left ${
                            isSelected
                              ? "bg-gradient-to-br border-2 border-primary/40 " + mode.color
                              : "bg-muted/30 border-2 border-transparent hover:border-border"
                          }`}
                          data-testid={`checkbox-mode-${mode.id}`}
                        >
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? `bg-gradient-to-br ${mode.color}` : "bg-muted"
                          }`}>
                            <Icon className={`h-5 w-5 ${isSelected ? mode.iconColor : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                              {mode.label}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">
                              {mode.description}
                            </p>
                          </div>
                          <div className={`absolute top-2 right-2 h-5 w-5 rounded-full flex items-center justify-center transition-all ${
                            isSelected ? "bg-primary" : "bg-muted border border-border"
                          }`}>
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    {gameModes.length} mod seçildi. Oyun sırasında bu modlar rastgele oynanır.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-visible">
              <CardContent className="p-5 md:p-6 space-y-6">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Timer className="h-5 w-5 text-primary" />
                  Oyun Ayarları
                </h3>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="maxPlayers" className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        Maksimum Oyuncu
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">{maxPlayers}</span>
                        <span className="text-sm text-muted-foreground">kişi</span>
                      </div>
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
                      <span>2 kişi</span>
                      <span>12 kişi</span>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="totalRounds" className="flex items-center gap-2 text-sm">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        Toplam Tur
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">{totalRounds}</span>
                        <span className="text-sm text-muted-foreground">tur</span>
                      </div>
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
                      <span>2 tur</span>
                      <span>15 tur</span>
                    </div>
                  </div>

                  <div className="h-px bg-border" />

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="roundDuration" className="flex items-center gap-2 text-sm">
                        <Timer className="h-4 w-4 text-muted-foreground" />
                        Tur Süresi
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-2xl font-bold text-primary">{roundDuration}</span>
                        <span className="text-sm text-muted-foreground">saniye</span>
                      </div>
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
                      <span>10 saniye</span>
                      <span>30 saniye</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <Play className="h-4 w-4 text-primary" />
                  <span className="text-sm">
                    Tahmini oyun süresi: <strong className="text-primary">{estimatedDuration} dakika</strong>
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-visible">
              <CardContent className="p-5 md:p-6 space-y-4">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  {isPublic ? <Globe className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-primary" />}
                  Oda Gizliliği
                </h3>

                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      isPublic ? "bg-primary/10" : "bg-muted"
                    }`}>
                      {isPublic ? (
                        <Globe className="h-5 w-5 text-primary" />
                      ) : (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">
                        {isPublic ? "Herkese Açık" : "Şifreli Oda"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {isPublic
                          ? "Oda kodunu bilen herkes katılabilir."
                          : "Odaya katılmak için şifre gereklidir."}
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
                      placeholder="Şifreni gir"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12"
                      data-testid="input-password"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold gap-3"
                size="lg"
                disabled={createRoomMutation.isPending || !roomName.trim()}
                data-testid="button-create-room"
              >
                {createRoomMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Oda oluşturuluyor...
                  </>
                ) : (
                  <>
                    Odayı Oluştur
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </Button>
              <p className="text-center text-xs text-muted-foreground mt-3">
                Odayı oluşturduktan sonra arkadaşlarını davet edebilirsin.
              </p>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
