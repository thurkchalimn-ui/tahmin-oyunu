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
  league?: string;
  kickoffAt: string; // ISO 8601 zaman damgası - maç başlangıcı (tahmin kilidi)
  result: PredictionChoice | null; // Sonuç girilene kadar null
  createdAt: string;
}

// Kullanıcının bir maça verdiği tahmin
export interface Prediction {
  id: string; // `${userId}_${matchId}` formatında, tekrar tahmini engeller
  userId: string;
  matchId: string;
  matchGlobalOrder: number;
  choice: PredictionChoice;
  isCorrect: boolean | null; // Sonuç girilmeden önce null
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
  createdAt: string;
  updatedAt: string;
}

// Async veri çekme durumları için ortak tip (loading/error ekranları için)
export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}
