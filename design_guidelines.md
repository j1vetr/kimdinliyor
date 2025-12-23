# Spotify Oda Oyunu - Design Guidelines

## Design Approach
**Reference-Based Approach**: Draw inspiration from Spotify's own design language combined with modern gaming interfaces (Discord, Kahoot). Focus on premium, dark aesthetics with social gaming elements.

**Core Principles**:
- Premium but accessible social gaming experience
- Mobile-first with exceptional desktop presentation
- Minimal distractions, maximum clarity during gameplay
- Turkish language throughout

## Typography System

**Font Family**: Poppins (Google Fonts)
- **Headings**: Poppins SemiBold (600) - Oda adları, oyun başlıkları
- **Body**: Poppins Regular (400) - Genel metin, açıklamalar
- **UI Elements**: Poppins Medium (500) - Butonlar, etiketler
- **Scores/Numbers**: Poppins Bold (700) - Puanlar, sayaçlar

**Scale**:
- Hero text: text-4xl md:text-5xl
- Section headers: text-2xl md:text-3xl
- Card titles: text-lg md:text-xl
- Body text: text-base
- Small labels: text-sm

## Layout System

**Spacing Primitives**: Use Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: p-2, gap-2
- Standard spacing: p-4, gap-4, m-4
- Section spacing: p-8, py-12
- Large gaps: gap-6, py-16

**Container Structure**:
- Max width: max-w-6xl for main content
- Mobile: px-4
- Desktop: px-8
- Full-width sections for lobby and game screens

## Screen-Specific Layouts

### 1. Ana Sayfa (Homepage)
- Centered vertical layout
- Hero: Spotify logo + "Oda Oyunu" başlık (text-5xl)
- Two primary action cards: "Oda Oluştur" ve "Odaya Katıl"
- Cards: Large (min-h-32), rounded-xl, hover lift effect
- Background: Subtle gradient overlay

### 2. Oda Oluştur (Create Room)
- Single column form: max-w-md mx-auto
- Form fields stack vertically with gap-4
- Toggle switches for "Herkese Açık/Özel"
- Conditional password field slides in
- Action button: Full width, prominent

### 3. Katılım Sayfası (Join Page)
- Two-step vertical flow:
  1. "İsim Gir" field (large, centered)
  2. "Spotify Bağla" button (prominent, with Spotify green accent)
- Checkbox: "Dinleme geçmişim/playlist verilerim bu oda oyununda kullanılacaktır" (must be visible and clear)
- Progress indicator showing connection status

### 4. Lobby
- Split layout:
  - **Left/Top (mobile)**: Oda bilgileri card (oda adı, kod, paylaşım linki)
  - **Center**: Oyuncu listesi (vertical scrollable)
    - Each player: Avatar placeholder + isim + Spotify connected badge
    - Host badge for room creator
  - **Bottom**: "Oyunu Başlat" (host only, full-width on mobile, centered on desktop)
- Real-time player count: "3/8 Oyuncu"

### 5. Oyun Ekranı (Game Screen)
- Full-screen immersive layout
- **Top**: Round indicator + Timer (20sn countdown, circular progress)
- **Center**: 
  - Album art (large, square, rounded-lg, max-w-sm)
  - Track name (text-2xl, bold)
  - Artist name (text-lg, muted)
- **Bottom**: 
  - Soru: "Bu şarkıyı kim/kimler dinliyor?"
  - Player selection grid (2 columns mobile, 3-4 desktop)
  - Multi-select checkboxes with player names
  - "Cevapla" button (disabled until selection made)

### 6. Sonuç Ekranı (Results)
- **Top**: "Doğru Cevap" başlık
- **Center**: Correct player names highlighted
- **Results Cards**: Grid showing each player's answer
  - Checkmark/X icon + player name + points earned
- **Bottom**: 
  - Current scoreboard (compact, top 3 highlighted)
  - "Sonraki Tur" button (host only) / "Bekliyor..." (others)

## Component Library

### Navigation
- **Top Bar**: Minimal, sticky
  - Logo/Title left
  - Room code right (in-game)
  - Exit/Menu icon

### Cards
- **Room Card**: rounded-xl, p-6, hover:scale-105 transition
- **Player Card**: rounded-lg, p-4, flex items-center gap-3
- **Result Card**: rounded-lg, p-3, border accent for correct/incorrect

### Forms
- **Input Fields**: rounded-lg, p-3, border focus states
- **Toggle Switch**: Modern switch component for public/private
- **Checkbox**: Large, easy to tap (min-w-5 min-h-5)

### Buttons
- **Primary**: Full rounded-lg, p-4, font-medium
- **Secondary**: Outlined variant
- **Icon Buttons**: Square, rounded-lg, p-3

### Status Indicators
- **Spotify Badge**: Small pill with icon + "Bağlı"
- **Host Badge**: Crown icon + "Host"
- **Timer**: Circular progress ring around number

### Data Display
- **Scoreboard**: Table or card grid
  - Rank number, player name, total score
  - Podium-style top 3
- **Album Art**: Always square, rounded-lg, shadow-lg

## Animations & Interactions

**Principle**: Smooth but fast, never blocking gameplay

- **Transitions**: 150-200ms for most interactions
- **Lobby Updates**: Fade in/out for player joins (300ms)
- **Question Reveal**: Scale-up album art + slide-up question (400ms)
- **Timer**: Pulse effect at last 5 seconds
- **Results**: Stagger reveal of correct/incorrect (100ms delay between cards)
- **Score Updates**: Number count-up animation
- **NO hover states** on hero/image overlays

## Accessibility

- All interactive elements min 44px touch targets
- High contrast text throughout
- Focus indicators on all interactive elements
- Loading states for Spotify auth and game transitions
- Error messages in Turkish, user-friendly

## Images

**Required Images**:
1. **Homepage Hero Background**: Abstract music visualization (subtle, dark)
2. **Album Art Placeholders**: During track loading (Spotify-style gradient)
3. **Empty State**: No players in lobby - friendly illustration

**Image Treatment**:
- All album art: Square, rounded-lg, shadow-xl
- Background overlays: 70-80% opacity dark overlay
- Buttons on images: Backdrop blur + semi-transparent background

## Performance Notes

- Lazy load album art
- Optimize for real-time updates (WebSocket)
- Smooth 60fps animations
- Mobile-optimized touch interactions