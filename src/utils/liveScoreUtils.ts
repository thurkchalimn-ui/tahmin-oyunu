import type { LiveScore } from '@/types';

// football-data.org'un kullandığı durum kodları (API-Football'dan farklı)
const LIVE_STATUSES = new Set(['IN_PLAY', 'PAUSED']);
const STATUS_LABELS: Record<string, string> = {
  IN_PLAY: 'Canlı',
  PAUSED: 'Devre Arası',
  FINISHED: 'Maç Bitti',
  POSTPONED: 'Ertelendi',
  SUSPENDED: 'Askıya Alındı',
  CANCELLED: 'İptal Edildi',
  AWARDED: 'Hükmen',
};

/** football-data.org durum koduna göre gösterilecek etiketi ve "canlı" olup olmadığını döner. */
export function getLiveScoreLabel(liveScore: LiveScore): { label: string; isLive: boolean } {
  const isLive = LIVE_STATUSES.has(liveScore.status);
  const base = STATUS_LABELS[liveScore.status] ?? liveScore.status;
  const label = isLive && liveScore.minute ? `${base} · ${liveScore.minute}'` : base;
  return { label, isLive };
}
