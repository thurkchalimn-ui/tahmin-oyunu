import { Link } from 'react-router-dom';
import { History, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { IconBadge } from '@/components/common/IconBadge';
import { TeamLogo } from '@/components/common/TeamLogo';
import type { Match, Prediction, PredictionChoice } from '@/types';

interface RecentPredictionCardsProps {
  items: { match: Match; prediction: Prediction }[];
  /** Sağdaki "Tümü →" linkinin gideceği adres. Verilmezse link hiç gösterilmez
      (ör. başka bir oyuncunun profilinde - onun tüm tahminlerine ait ayrı bir
      sayfamız yok). */
  viewAllHref?: string;
  /** Başlık metni - kendi profilinde "Son Tahminlerin", başkasınınkinde "Son Tahminleri" gibi. */
  title?: string;
}

const CHOICE_LABELS: Record<PredictionChoice, string> = {
  HOME: '1',
  DRAW: 'X',
  AWAY: '2',
};

function formatCardDate(dateKey: string): string {
  const date = new Date(dateKey);
  if (Number.isNaN(date.getTime())) return dateKey;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
}

/**
 * Profil sayfasındaki "Son Tahminlerin" kart şeridi. ÖNEMLİ: Artık sadece
 * sonuçlanmış tahminler değil, HENÜZ SONUÇLANMAMIŞ (bekleyen) tahminler de
 * gösteriliyor - ve bekleyenler listenin EN BAŞINDA yer alıyor (kullanıcının
 * "şu an ne bekliyorum" sorusuna hemen cevap versin diye). Sonuçlanmış
 * tahminler bekleyenlerden sonra, en yeniden eskiye doğru sıralanır.
 */
export function RecentPredictionCards({ items, viewAllHref, title = 'Son Tahminlerin' }: RecentPredictionCardsProps) {
  const pending = items.filter((i) => i.prediction.isCorrect === null);
  const resolved = items.filter((i) => i.prediction.isCorrect !== null);
  const combined = [...pending, ...resolved].slice(0, 6);

  if (combined.length === 0) return null;

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
          <IconBadge icon={<History size={16} />} size="sm" />
          {title}
        </h2>
        {viewAllHref && (
          <Link to={viewAllHref} className="font-mono text-xs text-scoreboard-amber hover:underline">
            Tümü →
          </Link>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {combined.map(({ match, prediction }) => {
          const status: 'pending' | 'correct' | 'wrong' =
            prediction.isCorrect === null ? 'pending' : prediction.isCorrect ? 'correct' : 'wrong';

          return (
            <div
              key={match.id}
              className={`flex w-40 shrink-0 flex-col gap-2 rounded-lg border p-3 ${
                status === 'pending'
                  ? 'border-scoreboard-amber/40 bg-scoreboard-amber/5 dark:bg-scoreboard-amber/10'
                  : 'border-pitch-700/15 bg-white dark:border-pitch-700 dark:bg-pitch-800'
              }`}
            >
              <p className="font-mono text-[10px] text-pitch-700/50 dark:text-pitch-100/40">
                {formatCardDate(match.date)}
              </p>

              <div className="flex items-center justify-between gap-1">
                <TeamLogo name={match.homeTeam} logoUrl={match.homeTeamLogo} />
                <span className="font-mono text-xs text-pitch-700/40 dark:text-pitch-100/30">vs</span>
                <TeamLogo name={match.awayTeam} logoUrl={match.awayTeamLogo} />
              </div>
              <p className="truncate font-body text-[11px] text-pitch-900 dark:text-pitch-100">
                {match.homeTeam} - {match.awayTeam}
              </p>

              <p className="font-mono text-[10px] text-pitch-700/60 dark:text-pitch-100/50">
                Tahminin: <span className="font-bold">{CHOICE_LABELS[prediction.choice]}</span>
              </p>

              <div className="flex items-center gap-1">
                {status === 'pending' && <Clock size={14} className="text-scoreboard-amber" />}
                {status === 'correct' && <CheckCircle2 size={14} className="text-pick-correct" />}
                {status === 'wrong' && <XCircle size={14} className="text-pick-wrong" />}
                <span
                  className={`font-mono text-[11px] font-semibold ${
                    status === 'pending'
                      ? 'text-scoreboard-amberDark dark:text-scoreboard-amber'
                      : status === 'correct'
                        ? 'text-pick-correct'
                        : 'text-pick-wrong'
                  }`}
                >
                  {status === 'pending' ? 'Sonuç Bekleniyor' : status === 'correct' ? 'Doğru Tahmin' : 'Yanlış Tahmin'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
