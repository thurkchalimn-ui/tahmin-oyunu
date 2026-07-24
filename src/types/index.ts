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
export interface Badge {
  streakLength: number; // Ulaşılan seri uzunluğu (ör. 15)
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
  createdAt: string;
  updatedAt: string;
}

// Async veri çekme durumları için ortak tip (loading/error ekranları için)
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
  text: string;
  isAdmin: boolean; // Gönderen admin mi? (Firestore kuralında doğrulanır, sahte etiket takılamaz)
  createdAt: string; // ISO 8601
}
