import { Link } from 'react-router-dom';
import type { UserProfile } from '@/types';

interface LeaderboardTableProps {
  users: UserProfile[];
  currentUserId?: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

/** En yüksek seriye göre sıralanmış kullanıcıları gösteren tablo. */
export function LeaderboardTable({ users, currentUserId }: LeaderboardTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-pitch-700/20 p-8 text-center dark:border-pitch-700">
        <p className="font-body text-sm text-pitch-700/60 dark:text-pitch-100/50">
          Henüz sıralamada kimse yok. İlk tahminini yap!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-pitch-700/15 dark:border-pitch-700">
      <table className="w-full text-left">
        <thead className="bg-pitch-700/5 dark:bg-pitch-800">
          <tr className="font-mono text-xs uppercase tracking-wide text-pitch-700/60 dark:text-pitch-100/50">
            <th className="px-4 py-3">#</th>
            <th className="px-4 py-3">Oyuncu</th>
            <th className="px-4 py-3 text-right">En İyi Seri</th>
            <th className="px-4 py-3 text-right">Güncel Seri</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, i) => (
            <tr
              key={user.uid}
              className={`border-t border-pitch-700/10 font-body text-sm dark:border-pitch-700/50 ${
                user.uid === currentUserId ? 'bg-scoreboard-amber/10' : ''
              }`}
            >
              <td className="px-4 py-3 font-mono text-pitch-700/70 dark:text-pitch-100/60">
                {MEDALS[i] ?? i + 1}
              </td>
              <td className="px-4 py-3 font-medium text-pitch-900 dark:text-pitch-100">
                <Link
                  to={`/oyuncu/${user.uid}`}
                  className="inline-flex items-center gap-1.5 hover:text-scoreboard-amber hover:underline"
                >
                  <span aria-hidden="true">⚽</span>
                  {user.displayName}
                </Link>
                {user.badges.some((b) => b.streakLength >= 15) && <span className="ml-1">🏆</span>}
              </td>
              <td className="px-4 py-3 text-right font-mono text-scoreboard-amber">{user.bestStreak}</td>
              <td className="px-4 py-3 text-right font-mono text-pitch-700/70 dark:text-pitch-100/60">
                {user.currentStreak}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
