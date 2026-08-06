import { Link } from 'react-router-dom';
import { Star, Flame, ChevronRight } from 'lucide-react';
import type { UserProfile } from '@/types';
import { Avatar } from '@/components/common/Avatar';

interface LeaderboardTableProps {
  users: UserProfile[];
  currentUserId?: string;
  /** 'all': XP + en iyi seri gösterilir. 'period': o döneme ait doğru/toplam gösterilir. */
  mode?: 'all' | 'period';
  /** Kendi sıranı, ana listede görünmese bile en altta sabit gösterir. */
  ownRow?: { rank: number; user: UserProfile } | null;
  /** Sıra numaralarına eklenecek ofset (ör. podyumdan sonra gelen liste 4'ten başlasın diye 3). */
  rankOffset?: number;
}

/**
 * Liderlik tablosu - artık klasik bir <table> DEĞİL, mockup'takine benzer
 * satır listesi: sıra numarası, oyuncu (avatar+isim), XP (yıldız ikonuyla),
 * en iyi seri (alev ikonuyla). 'period' modunda XP yerine o döneme ait
 * doğru/toplam tahmin gösterilir (dönemsel önbellek gerçek XP içermiyor).
 */
export function LeaderboardTable({ users, currentUserId, mode = 'all', ownRow, rankOffset = 0 }: LeaderboardTableProps) {
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
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-pitch-700/15 dark:border-pitch-700">
        {mode === 'all' && (
          <div className="flex items-center gap-3 bg-pitch-700/5 px-4 py-2 font-mono text-[10px] uppercase tracking-wide text-pitch-700/60 dark:bg-pitch-800 dark:text-pitch-100/50">
            <span className="w-8">Sıra</span>
            <span className="flex-1">Oyuncu</span>
            <span className="w-20 text-right">XP</span>
            <span className="w-20 text-right">En İyi Seri</span>
            <span className="w-4" />
          </div>
        )}
        <div className="divide-y divide-pitch-700/10 dark:divide-pitch-700/50">
          {users.map((user, i) => (
            <Row key={user.uid} user={user} rank={i + 1 + rankOffset} mode={mode} highlighted={user.uid === currentUserId} />
          ))}
        </div>
      </div>

      {/* Kendi sıra - listede görünmüyorsa (ör. ilk 50 dışında kaldıysa) en altta sabit gösterilir */}
      {ownRow && !users.some((u) => u.uid === currentUserId) && (
        <div className="overflow-hidden rounded-xl border-2 border-scoreboard-amber shadow-glow">
          <Row user={ownRow.user} rank={ownRow.rank} mode={mode} highlighted isPinned />
        </div>
      )}
    </div>
  );
}

function Row({
  user,
  rank,
  mode,
  highlighted,
  isPinned = false,
}: {
  user: UserProfile;
  rank: number;
  mode: 'all' | 'period';
  highlighted: boolean;
  isPinned?: boolean;
}) {
  const accuracy =
    user.totalPredictions > 0 ? Math.round((user.correctPredictions / user.totalPredictions) * 100) : null;

  return (
    <Link
      to={`/oyuncu/${user.uid}`}
      className={`flex items-center gap-3 px-4 py-3 transition ${
        highlighted
          ? 'bg-scoreboard-amber/10'
          : 'bg-white hover:bg-pitch-700/5 dark:bg-pitch-800 dark:hover:bg-pitch-700/30'
      }`}
    >
      <span
        className={`w-8 shrink-0 font-mono text-sm font-bold ${
          highlighted ? 'text-scoreboard-amber' : 'text-pitch-700/70 dark:text-pitch-100/60'
        }`}
      >
        {rank}
      </span>

      <div className="flex flex-1 items-center gap-2 overflow-hidden">
        <Avatar avatarUrl={user.avatarUrl} size="sm" />
        <span
          className={`truncate font-body text-sm font-medium ${
            highlighted ? 'text-scoreboard-amberDark dark:text-scoreboard-amber' : 'text-pitch-900 dark:text-pitch-100'
          }`}
        >
          {isPinned ? `Sen (${user.displayName})` : user.displayName}
        </span>
      </div>

      {mode === 'all' ? (
        <>
          <span className="flex w-20 shrink-0 items-center justify-end gap-1 font-mono text-sm font-bold text-scoreboard-amber">
            <Star size={12} />
            {user.xp}
          </span>
          <span className="flex w-20 shrink-0 items-center justify-end gap-1 font-mono text-xs text-pitch-700/70 dark:text-pitch-100/60">
            <Flame size={11} className="text-scoreboard-amber" />
            {user.bestStreak}
          </span>
        </>
      ) : (
        <>
          <span className="shrink-0 font-mono text-xs text-pick-correct">{user.correctPredictions} doğru</span>
          <span className="shrink-0 font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
            {accuracy === null ? '—' : `%${accuracy}`}
          </span>
        </>
      )}

      <ChevronRight size={16} className="shrink-0 text-pitch-700/30 dark:text-pitch-100/20" />
    </Link>
  );
}
