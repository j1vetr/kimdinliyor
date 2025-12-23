# Spotify Oda Oyunu

## Proje Özeti
Multiplayer müzik tahmin oyunu. Kullanıcılar oda oluşturup, Spotify hesaplarını bağlayarak arkadaşlarıyla "Bu şarkıyı kim dinliyor?" sorusunu cevaplıyor.

## Teknoloji Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Veritabanı**: PostgreSQL + Drizzle ORM
- **Gerçek Zamanlı**: WebSocket (ws)
- **Spotify**: @spotify/web-api-ts-sdk (Replit Connector ile)

## Proje Yapısı
```
client/
  src/
    components/          # UI bileşenleri
      player-card.tsx    # Oyuncu kartı
      track-card.tsx     # Şarkı kartı
      timer-ring.tsx     # Sayaç halkası
      theme-toggle.tsx   # Tema değiştirici
      spotify-icon.tsx   # Spotify ikonu
      ui/               # shadcn bileşenleri
    pages/
      home.tsx          # Ana sayfa
      create-room.tsx   # Oda oluştur
      join-room.tsx     # Odaya katıl
      lobby.tsx         # Bekleme odası
      game.tsx          # Oyun ekranı
      results.tsx       # Sonuç ekranı
    lib/
      theme.tsx         # ThemeProvider
      queryClient.ts    # TanStack Query
server/
  routes.ts             # API endpoints + WebSocket
  storage.ts            # DatabaseStorage
  spotify.ts            # Spotify API entegrasyonu
  db.ts                 # Drizzle bağlantısı
shared/
  schema.ts             # Veritabanı şeması
```

## Veritabanı Şeması
- **users**: Kullanıcılar (displayName, uniqueName, spotifyConnected)
- **rooms**: Odalar (code, name, maxPlayers, isPublic, status)
- **room_players**: Oda-oyuncu ilişkisi
- **tracks_cache**: Şarkı havuzu
- **rounds**: Oyun turları
- **answers**: Cevaplar

## API Endpoints
- `POST /api/rooms` - Oda oluştur
- `GET /api/rooms/:code/info` - Oda bilgisi
- `GET /api/rooms/:code` - Oda + oyuncular
- `POST /api/rooms/:code/join` - Odaya katıl
- `POST /api/rooms/:code/start` - Oyunu başlat
- `GET /api/rooms/:code/game` - Oyun durumu
- `POST /api/rooms/:code/answer` - Cevap gönder
- `GET /api/rooms/:code/results` - Final sonuçları

## Oyun Akışı
1. Host oda oluşturur (O + 6 haneli kod)
2. Oyuncular oda kodunu girerek katılır
3. Herkes Spotify bağlar ve onay verir
4. Host oyunu başlatır
5. Her turda rastgele bir şarkı seçilir
6. Oyuncular "Bu şarkıyı kim dinliyor?" sorusunu cevaplar
7. 20 saniye süre veya herkes cevapladığında tur biter
8. Puanlama: Tam doğru +10, Kısmi +5, Yanlış 0
9. 10 tur sonunda oyun biter

## Önemli Notlar
- Tüm UI metinleri Türkçe
- Dark tema varsayılan (antrasit/kömür gri)
- Font: Poppins
- Mobil öncelikli tasarım
- Spotify entegrasyonu Replit Connector ile
