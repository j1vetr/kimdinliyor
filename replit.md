# Kim Beğendi? - YouTube Oyunu

## Proje Özeti
Multiplayer YouTube tahmin oyunu. Kullanıcılar oda oluşturup, Google/YouTube hesaplarını bağlayarak arkadaşlarıyla "Bu videoyu kim beğendi?" veya "Bu kanala kim abone?" sorularını cevaplıyor.

## Teknoloji Stack
- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Backend**: Express.js + TypeScript
- **Veritabanı**: PostgreSQL + Drizzle ORM
- **Gerçek Zamanlı**: WebSocket (ws)
- **YouTube**: YouTube Data API v3 (Google OAuth ile)

## Proje Yapısı
```
client/
  src/
    components/          # UI bileşenleri
      player-card.tsx    # Oyuncu kartı (Google avatar)
      timer-ring.tsx     # Sayaç halkası
      logo.tsx           # TOOV logosu
      ui/                # shadcn bileşenleri
    pages/
      home.tsx           # Ana sayfa
      create-room.tsx    # Oda oluştur (ayarlar ile)
      join-room.tsx      # Odaya katıl
      lobby.tsx          # Bekleme odası (Google bağlantısı)
      game.tsx           # Oyun ekranı (video/kanal)
      results.tsx        # Sonuç ekranı (rematch ile)
    lib/
      theme.tsx          # ThemeProvider
      queryClient.ts     # TanStack Query
server/
  routes.ts              # API endpoints + WebSocket
  storage.ts             # DatabaseStorage
  youtube.ts             # YouTube API entegrasyonu
  db.ts                  # Drizzle bağlantısı
shared/
  schema.ts              # Veritabanı şeması
```

## Veritabanı Şeması
- **users**: Kullanıcılar (displayName, uniqueName, googleConnected, avatarUrl)
- **rooms**: Odalar (code, name, maxPlayers, isPublic, status, totalRounds, roundDuration)
- **room_players**: Oda-oyuncu ilişkisi (totalScore)
- **google_tokens**: Google OAuth token'ları (accessToken, refreshToken, expiresAt)
- **content_cache**: YouTube içerik havuzu (video + kanal, sourceUserIds)
- **rounds**: Oyun turları (contentId, correctUserIds)
- **answers**: Cevaplar (oderId, selectedUserIds, score)

## API Endpoints
- `GET /api/google/auth-url` - Google OAuth URL al
- `GET /api/auth/google/callback` - OAuth callback
- `POST /api/rooms` - Oda oluştur (totalRounds, roundDuration)
- `GET /api/rooms/:code/info` - Oda bilgisi
- `GET /api/rooms/:code` - Oda + oyuncular
- `POST /api/rooms/:code/join` - Odaya katıl
- `POST /api/rooms/:code/start` - Oyunu başlat
- `GET /api/rooms/:code/game` - Oyun durumu
- `POST /api/rooms/:code/answer` - Cevap gönder
- `GET /api/rooms/:code/results` - Final sonuçları
- `POST /api/rooms/:code/rematch` - Tekrar oyna

## Oyun Akışı
1. Host oda oluşturur (6 haneli sayı kodu, örn: 533146)
2. Oda ayarları: tur sayısı (2-15), tur süresi (10-30 sn)
3. Oyuncular oda kodunu girerek katılır
4. Herkes Google/YouTube bağlar ve onay verir
5. Host oyunu başlatır
6. Her turda rastgele video veya kanal seçilir
7. Soru: "Bu videoyu kim beğendi?" veya "Bu kanala kim abone?"
8. Puanlama: Doğru seçim +5, Yanlış seçim -5
9. Seri bonusu: 3+ art arda doğru = +10 ekstra puan
10. Yıldırım turları (5. ve 10. tur): 2x puan çarpanı
11. Oyun bitince sonuçlar gösterilir, rematch seçeneği

## İçerik Tipleri
- **Video**: Kullanıcının beğendiği YouTube videoları
- **Kanal**: Kullanıcının abone olduğu YouTube kanalları

## VS Arena Tasarımı (Karşılaştırma Modları)
Karşılaştırma modları için tam ekran immersive layout:
- Bulanık arka plan (içerik thumbnail'inden)
- Split-screen düzen: Sol kart (kırmızı), Sağ kart (mavi)
- Merkezi VS rozeti (amber gradient, dönen animasyon)
- Framer-motion ile kart giriş animasyonları
- Responsive: Mobilde dikey (flex-col), masaüstünde yatay (md:flex-row)
- CSS token'ları: `--compare-left`, `--compare-right` (HSL formatında)

## Oda Durumları
- `waiting`: Lobi, oyuncular bekliyor
- `playing`: Oyun aktif
- `finished`: Oyun bitti

## Oyun Faz Sistemi (Sunucu-odaklı)
Oyun sırasında 3 faz döngüsü vardır (tümü sunucu tarafından yönetilir):
1. **question**: Soru gösteriliyor, cevap bekleniyor
   - Süre: roundDuration saniye (varsayılan 20)
   - Cevaplar kabul ediliyor
   - `correctAnswer` gizli tutulur (güvenlik)
2. **reveal**: Doğru cevap ve puanlar gösteriliyor
   - Süre: 3 saniye
   - `revealData` içerir: correctUserIds, correctContentId, results
3. **intermission**: Sonraki tura geçiş sayacı
   - Süre: 2 saniye
   - Sayaç animasyonu

### WebSocket Mesajları
- `phase_changed`: Tek mesaj tipi ile tüm faz geçişleri (question, reveal, intermission)
  - `phase`, `phaseStartedAt`, `phaseEndsAt`, `round`, `content`, `revealData`
- `game_finished`: Oyun sonu
- `player_answered`: Oyuncu cevap verdi
- `reaction`: Emoji tepkisi

### İstemci Prensibi
- İstemci sadece sunucudan gelen timestamp'leri (`phaseEndsAt`) kullanarak countdown hesaplar
- Fazlar arası geçiş için yerel timer yok - tüm geçişler sunucu tarafından tetiklenir

## API Kotası
- YouTube Data API: 10,000 units/gün
- Liked videos: ~1 unit/request
- Subscriptions: ~1 unit/request
- Channels: ~1 unit/request

## Secrets (Replit)
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
- `SESSION_SECRET`: Oturum şifresi

## Önemli Notlar
- Tüm UI metinleri Türkçe
- Dark tema varsayılan (antrasit/kömür gri)
- Font: Poppins
- Mobil öncelikli tasarım
- Google OAuth ile YouTube verilerine erişim
- Birden fazla doğru cevap desteklenir (aynı içeriği paylaşan oyuncular)
- `answers.oderId` alanı tutarlılık için `userId` yerine kullanılıyor
