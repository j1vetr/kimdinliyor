import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Home,
  Key,
  Database,
  Trash2,
  RefreshCw,
  LogOut,
  AlertTriangle,
  Clock,
  Gamepad2,
  FileText,
  XCircle,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AdminStats {
  userCount: number;
  roomCount: number;
  activeRoomCount: number;
  tokenCount: number;
  contentCount: number;
  roundCount: number;
}

interface User {
  id: string;
  displayName: string;
  uniqueName: string;
  googleConnected: boolean;
  avatarUrl: string | null;
  createdAt: string | null;
}

interface Room {
  id: string;
  code: string;
  name: string;
  status: string;
  maxPlayers: number;
  currentRound: number;
  totalRounds: number;
  createdAt: string | null;
}

interface Token {
  userId: string;
  expiresAt: string;
  createdAt: string | null;
}

function getAdminToken() {
  return localStorage.getItem("adminToken");
}

function adminFetch(url: string, options: RequestInit = {}) {
  const token = getAdminToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
}

export default function AdminPanel() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setLocation("/yt-login");
    }
  }, [setLocation]);

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const { data: users = [], refetch: refetchUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      return res.json();
    },
  });

  const { data: rooms = [], refetch: refetchRooms } = useQuery<Room[]>({
    queryKey: ["/api/admin/rooms"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/rooms");
      if (!res.ok) throw new Error("Failed to fetch rooms");
      return res.json();
    },
  });

  const { data: tokens = [], refetch: refetchTokens } = useQuery<Token[]>({
    queryKey: ["/api/admin/tokens"],
    queryFn: async () => {
      const res = await adminFetch("/api/admin/tokens");
      if (!res.ok) throw new Error("Failed to fetch tokens");
      return res.json();
    },
  });

  const refetchAll = () => {
    refetchStats();
    refetchUsers();
    refetchRooms();
    refetchTokens();
  };

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`/api/admin/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete user");
    },
    onSuccess: () => {
      toast({ title: "Kullanıcı silindi" });
      refetchAll();
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await adminFetch(`/api/admin/rooms/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete room");
    },
    onSuccess: () => {
      toast({ title: "Oda silindi" });
      refetchAll();
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const revokeTokenMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await adminFetch(`/api/admin/tokens/${userId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke token");
    },
    onSuccess: () => {
      toast({ title: "Token iptal edildi" });
      refetchAll();
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const revokeAllTokensMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/api/admin/tokens", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke all tokens");
    },
    onSuccess: () => {
      toast({ title: "Tüm tokenlar iptal edildi" });
      refetchAll();
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const clearOldRoomsMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/api/admin/clear-old-rooms", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear old rooms");
      return res.json();
    },
    onSuccess: (data) => {
      toast({ title: `${data.deletedCount} eski oda silindi` });
      refetchAll();
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const clearCacheMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/api/admin/clear-cache", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear cache");
    },
    onSuccess: () => {
      toast({ title: "Cache temizlendi" });
      refetchAll();
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const clearAllMutation = useMutation({
    mutationFn: async () => {
      const res = await adminFetch("/api/admin/clear-all", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear all data");
    },
    onSuccess: () => {
      toast({ title: "Tüm veriler temizlendi" });
      refetchAll();
    },
    onError: () => toast({ title: "Hata", variant: "destructive" }),
  });

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    setLocation("/yt-login");
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleString("tr-TR");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "waiting":
        return <Badge variant="secondary">Bekliyor</Badge>;
      case "playing":
        return <Badge className="bg-green-500">Oyunda</Badge>;
      case "finished":
        return <Badge variant="outline">Bitti</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <h1 className="text-2xl font-bold">Admin Panel</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refetchAll} data-testid="button-refresh">
              <RefreshCw className="h-4 w-4 mr-2" />
              Yenile
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats?.userCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Kullanıcı</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats?.roomCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Oda</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{stats?.activeRoomCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Aktif</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats?.tokenCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Token</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats?.contentCount || 0}</p>
                  <p className="text-xs text-muted-foreground">İçerik</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{stats?.roundCount || 0}</p>
                  <p className="text-xs text-muted-foreground">Tur</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Tehlikeli İşlemler
            </CardTitle>
            <CardDescription>Bu işlemler geri alınamaz</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-revoke-all-tokens">
                  <XCircle className="h-4 w-4 mr-2" />
                  Tüm Tokenları İptal Et
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tüm kullanıcıların Google bağlantısı kesilecek. Tekrar giriş yapmaları gerekecek.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => revokeAllTokensMutation.mutate()}>
                    Onayla
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-clear-old-rooms">
                  <Clock className="h-4 w-4 mr-2" />
                  Eski Odaları Temizle
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    24 saatten eski ve bitmiş tüm odalar silinecek.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearOldRoomsMutation.mutate()}>
                    Onayla
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-clear-cache">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Trending Cache Temizle
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Emin misiniz?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Trending içerik önbelleği temizlenecek. Yeni oyun başlatıldığında yeniden yüklenecek.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction onClick={() => clearCacheMutation.mutate()}>
                    Onayla
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" data-testid="button-clear-all">
                  <Trash2 className="h-4 w-4 mr-2" />
                  TÜM VERİLERİ SİL
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>DİKKAT!</AlertDialogTitle>
                  <AlertDialogDescription>
                    Bu işlem TÜM verileri silecek: kullanıcılar, odalar, tokenlar, oyun geçmişi.
                    Bu işlem geri alınamaz!
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>İptal</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive"
                    onClick={() => clearAllMutation.mutate()}
                  >
                    Evet, Tümünü Sil
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        <Tabs defaultValue="users" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" data-testid="tab-users">
              <Users className="h-4 w-4 mr-2" />
              Kullanıcılar ({users.length})
            </TabsTrigger>
            <TabsTrigger value="rooms" data-testid="tab-rooms">
              <Home className="h-4 w-4 mr-2" />
              Odalar ({rooms.length})
            </TabsTrigger>
            <TabsTrigger value="tokens" data-testid="tab-tokens">
              <Key className="h-4 w-4 mr-2" />
              Tokenlar ({tokens.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4">
            <div className="space-y-2">
              {users.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Kullanıcı yok</p>
              ) : (
                users.map((user) => (
                  <Card key={user.id}>
                    <CardContent className="py-3 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <Users className="h-4 w-4" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-sm">{user.displayName}</p>
                          <p className="text-xs text-muted-foreground">{user.uniqueName}</p>
                        </div>
                        {user.googleConnected && (
                          <Badge variant="secondary" className="text-[10px]">Google</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDate(user.createdAt)}</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Kullanıcıyı sil?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {user.displayName} silinecek. Bu işlem geri alınamaz.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteUserMutation.mutate(user.id)}>
                                Sil
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="rooms" className="mt-4">
            <div className="space-y-2">
              {rooms.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Oda yok</p>
              ) : (
                rooms.map((room) => (
                  <Card key={room.id}>
                    <CardContent className="py-3 flex items-center justify-between gap-4 flex-wrap">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono">{room.code}</Badge>
                        <div>
                          <p className="font-medium text-sm">{room.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Tur: {room.currentRound}/{room.totalRounds}
                          </p>
                        </div>
                        {getStatusBadge(room.status || "waiting")}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{formatDate(room.createdAt)}</span>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Odayı sil?</AlertDialogTitle>
                              <AlertDialogDescription>
                                {room.name} ({room.code}) silinecek. Bu işlem geri alınamaz.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>İptal</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteRoomMutation.mutate(room.id)}>
                                Sil
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="tokens" className="mt-4">
            <div className="space-y-2">
              {tokens.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Token yok</p>
              ) : (
                tokens.map((token) => {
                  const user = users.find((u) => u.id === token.userId);
                  const isExpired = new Date(token.expiresAt) < new Date();
                  return (
                    <Card key={token.userId}>
                      <CardContent className="py-3 flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium text-sm">{user?.displayName || token.userId}</p>
                            <p className="text-xs text-muted-foreground">
                              Bitiş: {formatDate(token.expiresAt)}
                            </p>
                          </div>
                          {isExpired && (
                            <Badge variant="destructive" className="text-[10px]">Süresi Dolmuş</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm">
                                <XCircle className="h-4 w-4 mr-2" />
                                İptal Et
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Token iptal edilsin mi?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Kullanıcının Google bağlantısı kesilecek.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>İptal</AlertDialogCancel>
                                <AlertDialogAction onClick={() => revokeTokenMutation.mutate(token.userId)}>
                                  Onayla
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
