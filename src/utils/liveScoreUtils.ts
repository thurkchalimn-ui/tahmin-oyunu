import type { LiveScore } from '@/types';

const LIVE_STATUSES = new Set(['1H', '2H', 'ET', 'BT', 'P', 'LIVE']);
const STATUS_LABELS: Record<string, string> = {
  '1H': 'İlk Yarı',
  HT: 'Devre Arası',
  '2H': 'İkinci Yarı',
  ET: 'Uzatmalar',
  BT: 'Mola',
  P: 'Penaltılar',
  LIVE: 'Canlı',
  SUSP: 'Askıya Alındı',
  INT: 'Yarıda Kesildi',
  FT: 'Maç Bitti',
  AET: 'Uzatmalarda Bitti',
  PEN: 'Penaltılarla Bitti',
  PST: 'Ertelendi',
  CANC: 'İptal Edildi',
  ABD: 'Yarıda Bırakıldı',
  AWD: 'Hükmen',
  WO: 'Hükmen Sonuç',
};

/** API-Football durum koduna göre gösterilecek etiketi ve "canlı" olup olmadığını döner. */
export function getLiveScoreLabel(liveScore: LiveScore): { label: string; isLive: boolean } {
  const isLive = LIVE_STATUSES.has(liveScore.status);
  const base = STATUS_LABELS[liveScore.status] ?? liveScore.status;
  const label = isLive && liveScore.minute ? `${base} · ${liveScore.minute}'` : base;
  return { label, isLive };
}
