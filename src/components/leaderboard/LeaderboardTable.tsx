import { Link } from 'react-router-dom';
import type { UserProfile } from '@/types';
import { Avatar } from '@/components/common/Avatar';
import { BadgeIcons } from '@/components/common/BadgeIcons';

interface LeaderboardTableProps {
  users: UserProfile[];
  currentUserId?: string;
  /** 'all': tüm-zamanlar serisi sütunları da gösterilir. 'period': sadece o döneme ait tahmin istatistikleri gösterilir. */
  mode?: 'all' | 'period';
}

const MEDALS = ['🥇', '🥈', '🥉'];

/**
 * Sıralanmış kullanıcıları gösteren tablo (tüm-zamanlar ya da dönemsel görünüm).
 * Mobilde yatay kaydırma gerekmeden sığması için başlıklar kısaltılmış,
 * boşluklar sadeleştirilmiştir; geniş ekranlarda (sm: ve üzeri) daha ferah görünür.
 */
export function LeaderboardTable({ users, currentUserId, mode = 'all' }: LeaderboardTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-pitch-700/20 p-8 text-center dark:border-pitch-700">
        <p className="font-body text-sm text-pitch-700/60 dark:text-pitch-100/50">
          {mode === 'all' ? 'Henüz sıralamada kimse yok. İlk tahminini yap!' : 'Bu dönemde henüz tahmin yapılmamış.'}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-pitch-700/15 dark:border-pitch-700">
      <table className="w-full text-left">
        <thead className="bg-pitch-700/5 dark:bg-pitch-800">
          <tr className="font-mono text-[9px] uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50 sm:text-xs">
            <th className="px-1.5 py-2 sm:px-4 sm:py-3">#</th>
            <th className="px-1.5 py-2 sm:px-4 sm:py-3">Oyuncu</th>
            {mode === 'all' && (
              <>
                <th className="px-1 py-2 text-right sm:px-4 sm:py-3">
                  <span className="sm:hidden">En İyi</span>
                  <span className="hidden sm:inline">En İyi Seri</span>
                </th>
                <th className="px-1 py-2 text-right sm:px-4 sm:py-3">
                  <span className="sm:hidden">Güncel</span>
                  <span className="hidden sm:inline">Güncel Seri</span>
                </th>
              </>
            )}
            <th className="px-1 py-2 text-right sm:px-4 sm:py-3">
              <span className="sm:hidden">Top.</span>
              <span className="hidden sm:inline">Toplam Tahmin</span>
            </th>
            <th className="px-1 py-2 text-right sm:px-4 sm:py-3">
              <span className="sm:hidden">Doğru</span>
              <span className="hidden sm:inline">Doğru Tahmin</span>
            </th>
            <th className="px-1.5 py-2 text-right sm:px-4 sm:py-3">%</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => {
            const accuracy =
              user.totalPredictions > 0
                ? Math.round((user.correctPredictions / user.totalPredictions) * 100)
                : null;
            return (
              <tr
                key={user.uid}
                className={`border-t border-pitch-700/10 font-body text-xs dark:border-pitch-700/50 sm:text-sm ${
                  user.uid === currentUserId ? 'bg-scoreboard-amber/10' : ''
                }`}
              >
                <td className="px-1.5 py-2 font-mono text-pitch-700/70 dark:text-pitch-100/60 sm:px-4 sm:py-3">
                  {MEDALS[i] ?? i + 1}
                </td>
                <td className="max-w-[90px] truncate px-1.5 py-2 font-medium text-pitch-900 dark:text-pitch-100 sm:max-w-none sm:px-4 sm:py-3">
                  <Link
                    to={`/oyuncu/${user.uid}`}
                    className="inline-flex items-center gap-1 hover:text-scoreboard-amber hover:underline sm:gap-1.5"
                  >
                    <Avatar avatarUrl={user.avatarUrl} size="sm" />
                    <span className="truncate">{user.displayName}</span>
                  </Link>
                  {user.badges.length > 0 && (
                    <span className="ml-1">
                      <BadgeIcons badges={user.badges} />
                    </span>
                  )}
                </td>
                {mode === 'all' && (
                  <>
                    <td className="px-1 py-2 text-right font-mono text-scoreboard-amber sm:px-4 sm:py-3">
                      {user.bestStreak}
                    </td>
                    <td className="px-1 py-2 text-right font-mono text-pitch-700/70 dark:text-pitch-100/60 sm:px-4 sm:py-3">
                      {user.currentStreak}
                    </td>
                  </>
                )}
                <td className="px-1 py-2 text-right font-mono text-pitch-700/70 dark:text-pitch-100/60 sm:px-4 sm:py-3">
                  {user.totalPredictions}
                </td>
                <td className="px-1 py-2 text-right font-mono text-pick-correct sm:px-4 sm:py-3">
                  {user.correctPredictions}
                </td>
                <td className="px-1.5 py-2 text-right font-mono text-pitch-700/70 dark:text-pitch-100/60 sm:px-4 sm:py-3">
                  {accuracy === null ? '—' : `${accuracy}%`}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
