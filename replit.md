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
      player-card.tsx    # Oyuncu kartı (avatar destekli)
      track-card.tsx     # Şarkı kartı
      timer-ring.tsx     # Sayaç halkası
      audio-visualizer.tsx # Equalizer animasyonu
      spotify-icon.tsx   # Spotify ikonu
      ui/               # shadcn bileşenleri
    pages/
      home.tsx          # Ana sayfa
      create-room.tsx   # Oda oluştur (ayarlar ile)
      join-room.tsx     # Odaya katıl
      lobby.tsx         # Bekleme odası
      game.tsx          # Oyun ekranı
      results.tsx       # Sonuç ekranı (rematch ile)
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
- **users**: Kullanıcılar (displayName, uniqueName, spotifyConnected, avatarUrl)
- **rooms**: Odalar (code, name, maxPlayers, isPublic, status, totalRounds, roundDuration)
- **room_players**: Oda-oyuncu ilişkisi
- **tracks_cache**: Şarkı havuzu
- **rounds**: Oyun turları
- **answers**: Cevaplar

## API Endpoints
- `POST /api/rooms` - Oda oluştur (totalRounds, roundDuration parametreleri ile)
- `GET /api/rooms/:code/info` - Oda bilgisi
- `GET /api/rooms/:code` - Oda + oyuncular
- `POST /api/rooms/:code/join` - Odaya katıl
- `POST /api/rooms/:code/start` - Oyunu başlat
- `GET /api/rooms/:code/game` - Oyun durumu
- `POST /api/rooms/:code/answer` - Cevap gönder
- `GET /api/rooms/:code/results` - Final sonuçları
- `POST /api/rooms/:code/rematch` - Tekrar oyna (skorları sıfırla, lobiye dön)

## Oyun Akışı
1. Host oda oluşturur (6 haneli sayı kodu, örn: 533146)
2. Oda ayarları: tur sayısı (2-15), tur süresi (10-30 sn)
3. Oyuncular oda kodunu girerek katılır
4. Herkes Spotify bağlar ve onay verir
5. Host oyunu başlatır
6. Her turda rastgele bir şarkı seçilir
7. Oyuncular "Bu şarkıyı kim dinliyor?" sorusunu cevaplar
8. Puanlama: Doğru seçim +5, Yanlış seçim -5
9. Seri bonusu: 3+ art arda doğru = +10 ekstra puan
10. Yıldırım turları (5. ve 10. tur): 2x puan çarpanı
11. Oyun bitince sonuçlar gösterilir, rematch seçeneği

## Oda Durumları
- `waiting`: Lobi, oyuncular bekliyor
- `playing`: Oyun aktif
- `finished`: Oyun bitti, sonuçlar görüntülenebilir

## Son Eklenen Özellikler
- **Oda Ayarları**: Tur sayısı (2-15) ve tur süresi (10-30 sn) özelleştirilebilir
- **Spotify Avatarları**: Oyuncu profil fotoğrafları Spotify'dan çekilir
- **Rematch Butonu**: Sonuç ekranında "Tekrar Oyna" butonu
- **Equalizer Animasyonu**: Şarkı çalarken görsel animasyon (AudioVisualizer komponenti)

## Önemli Notlar
- Tüm UI metinleri Türkçe
- Dark tema varsayılan (antrasit/kömür gri)
- Font: Poppins
- Mobil öncelikli tasarım
- Spotify entegrasyonu Replit Connector ile
- Oyun bitince oda "finished" durumunda kalır (sonuçlar korunur)
- Rematch ile skorlar sıfırlanır ve oyuncular lobiye döner
