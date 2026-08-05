// Tahmin seçenekleri: Ev sahibi kazanır / Beraberlik / Deplasman kazanır
export type PredictionChoice = 'HOME' | 'DRAW' | 'AWAY';

// Bir maç kaydı (admin tarafından günlük olarak eklenir)
export interface Match {
  id: string;
  date: string; // 'YYYY-MM-DD' formatında, maçın ait olduğu gün
  dayOrder: number; // O gün içindeki sıra (1-20)
  globalOrder: number; // Tüm maçlar arasındaki kronolojik sıra (seri hesaplaması için)
  homeTeam: string;
  awayTeam: string;
  homeTeamLogo?: string; // Admin panelinden girilen logo görseli linki (opsiyonel)
  awayTeamLogo?: string;
  league?: string;
  kickoffAt: string; // ISO 8601 zaman damgası - maç başlangıcı (tahmin kilidi)
  result: PredictionChoice | null; // Sonuç girilene kadar null
  liveScore?: LiveScore | null; // Otomasyon tarafından maç sırasında güncellenir
  createdAt: string;
}

// Otomasyon script'inin (bkz. automation/check-results.js) maç devam ederken
// yazdığı anlık skor bilgisi. status, API-Football'un ham kodlarını taşır
// (ör. '1H', 'HT', '2H', 'FT', 'PST'); ekranda gösterirken yorumlanır. Bu bilgi
// SADECE görüntüleme amaçlıdır - kesin sonuç (match.result) her zaman admin
// panelinden elle girilir, buradan otomatik belirlenmez.
export interface LiveScore {
  homeGoals: number;
  awayGoals: number;
  status: string;
  minute: string | null;
}

// Kullanıcının bir maça verdiği tahmin
export interface Prediction {
  id: string; // `${userId}_${matchId}` formatında, tekrar tahmini engeller
  userId: string;
  matchId: string;
  matchGlobalOrder: number;
  date: string; // Maçın 'YYYY-MM-DD' tarihi - günlük tahmin hakkı sayımı için
  choice: PredictionChoice;
  isCorrect: boolean | null; // Sonuç girilmeden önce null
  resolvedAt?: string | null; // Sonucun girildiği an (ISO) - "yeni sonuçlandı" bildirimi için
  createdAt: string;
}

// Kullanıcı profili ve seri istatistikleri
export type BadgeType = 'matchStreak' | 'correctTotal' | 'activityStreak';

export interface Badge {
  type: BadgeType; // 'matchStreak': art arda doğru tahmin serisi, 'correctTotal': toplam doğru tahmin eşiği, 'activityStreak': art arda giriş yapılan gün sayısı
  value: number; // Ulaşılan eşik (ör. matchStreak=15, correctTotal=100, activityStreak=30)
  achievedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  currentStreak: number; // Aktif art arda doğru bilme serisi
  bestStreak: number; // Şimdiye kadarki en yüksek seri
  totalPredictions: number;
  correctPredictions: number;
  badges: Badge[];
  isAdmin: boolean;
  // Bildirim göstergeleri (kırmızı nokta) için: kullanıcı ilgili sayfayı en son
  // ne zaman / hangi sırada gördü. Sayfa ziyaret edildiğinde güncellenir.
  lastSeenChatAt?: string | null;
  lastSeenRank?: number | null;
  lastSeenProfileAt?: string | null;
  avatarUrl?: string | null; // Kullanıcının kendi seçtiği profil görseli (futbolcu fotoğrafı, takım logosu vb.)
  notifyOnResult?: boolean; // Maç sonucu bildirimi istiyor mu? (belirtilmemişse true sayılır)
  notifyOnReminder?: boolean; // Maç başlamadan 30 dk kala hatırlatma istiyor mu? (belirtilmemişse true sayılır)
  lastActiveAt?: string | null; // Uygulamayı en son ne zaman açtığı (admin istatistikleri için - saatte bir güncellenir)
  activityStreak?: number; // Art arda kaç gündür uygulamayı açtığı (bir gün atlarsa sıfırlanır)
  lastActiveDateKey?: string | null; // activityStreak'in son sayıldığı gün ('YYYY-MM-DD')
  invitedByUid?: string | null; // Bu kullanıcıyı davet eden kişinin uid'si (davet linkiyle kayıt olduysa)
  xp: number; // Deneyim puanı - doğru/yanlış tahmin, rozet ve giriş serisinden hesaplanır (bkz. utils/xpUtils.ts)
  level: number; // xp'den TÜRETİLİR (Firestore'da ayrıca saklanmaz) - bkz. getLevelInfo()
  createdAt: string;
  updatedAt: string;
}

// Async veri çekme durumları için ortak tip (loading/error ekranları için)
// Kullanıcının kurduğu/üye olduğu özel lig (arkadaş grubu liderlik tablosu)
export interface League {
  id: string;
  name: string;
  ownerUid: string;
  memberUids: string[];
  createdAt: string;
}

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

// Sohbet kanalındaki tek bir mesaj
export interface ChatMessage {
  id: string;
  userId: string;
  displayName: string;
  avatarUrl?: string | null; // Gönderenin mesaj anındaki profil görseli
  badges?: Badge[]; // Gönderenin mesaj anındaki rozetleri
  xp?: number; // Gönderenin mesaj anındaki XP'si (Seviye rozeti göstermek için)
  text: string;
  isAdmin: boolean; // Gönderen admin mi? (Firestore kuralında doğrulanır, sahte etiket takılamaz)
  replyTo?: {
    messageId: string;
    displayName: string;
    text: string; // Alıntılanan mesajın kısa özeti (gönderim anında kopyalanır)
  } | null;
  createdAt: string; // ISO 8601
}
