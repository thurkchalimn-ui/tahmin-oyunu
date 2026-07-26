import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getFollowingUids, getFollowerUids } from '@/services/followService';
import { usePlayerProfilesByIds } from '@/hooks/usePlayerProfilesByIds';
import { Avatar } from '@/components/common/Avatar';

interface FollowListsProps {
  uid: string;
}

/**
 * Bir kullanıcının "Takip Ettiklerim" ve "Takipçilerim" listelerini, tıklanınca
 * açılıp kapanan iki bölüm halinde gösterir. Her isim, o kişinin profiline link verir.
 */
export function FollowLists({ uid }: FollowListsProps) {
  const [followingUids, setFollowingUids] = useState<string[]>([]);
  const [followerUids, setFollowerUids] = useState<string[]>([]);
  const [openSection, setOpenSection] = useState<'following' | 'followers' | null>(null);

  useEffect(() => {
    getFollowingUids(uid).then(setFollowingUids);
    getFollowerUids(uid).then(setFollowerUids);
  }, [uid]);

  const { data: followingProfiles } = usePlayerProfilesByIds(openSection === 'following' ? followingUids : []);
  const { data: followerProfiles } = usePlayerProfilesByIds(openSection === 'followers' ? followerUids : []);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <button
          onClick={() => setOpenSection((s) => (s === 'following' ? null : 'following'))}
          className={`flex-1 rounded-lg border p-2.5 text-center transition ${
            openSection === 'following'
              ? 'border-scoreboard-amber bg-scoreboard-amber/10'
              : 'border-pitch-700/15 dark:border-pitch-700'
          }`}
        >
          <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
            {followingUids.length}
          </p>
          <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
            Takip Ettiklerim
          </p>
        </button>
        <button
          onClick={() => setOpenSection((s) => (s === 'followers' ? null : 'followers'))}
          className={`flex-1 rounded-lg border p-2.5 text-center transition ${
            openSection === 'followers'
              ? 'border-scoreboard-amber bg-scoreboard-amber/10'
              : 'border-pitch-700/15 dark:border-pitch-700'
          }`}
        >
          <p className="font-mono text-lg font-bold text-pitch-900 dark:text-pitch-100">
            {followerUids.length}
          </p>
          <p className="font-mono text-[10px] uppercase text-pitch-700/60 dark:text-pitch-100/50">
            Takipçilerim
          </p>
        </button>
      </div>

      {openSection === 'following' && (
        <div className="flex flex-col gap-1 rounded-lg border border-pitch-700/15 bg-white p-2 dark:border-pitch-700 dark:bg-pitch-800">
          {followingProfiles.length === 0 ? (
            <p className="p-2 text-center font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
              Henüz kimseyi takip etmiyorsun.
            </p>
          ) : (
            followingProfiles.map((p) => (
              <Link
                key={p.uid}
                to={`/oyuncu/${p.uid}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-pitch-900 hover:bg-pitch-700/5 dark:text-pitch-100 dark:hover:bg-pitch-700/40"
              >
                <Avatar avatarUrl={p.avatarUrl} size="sm" />
                {p.displayName}
              </Link>
            ))
          )}
        </div>
      )}

      {openSection === 'followers' && (
        <div className="flex flex-col gap-1 rounded-lg border border-pitch-700/15 bg-white p-2 dark:border-pitch-700 dark:bg-pitch-800">
          {followerProfiles.length === 0 ? (
            <p className="p-2 text-center font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
              Henüz takipçin yok.
            </p>
          ) : (
            followerProfiles.map((p) => (
              <Link
                key={p.uid}
                to={`/oyuncu/${p.uid}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-pitch-900 hover:bg-pitch-700/5 dark:text-pitch-100 dark:hover:bg-pitch-700/40"
              >
                <Avatar avatarUrl={p.avatarUrl} size="sm" />
                {p.displayName}
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
