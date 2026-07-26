import { useEffect, useState } from 'react';
import {
  followUser,
  unfollowUser,
  isFollowing as checkIsFollowing,
  getFollowerCount,
  getFollowingCount,
} from '@/services/followService';
import { Button } from '@/components/common/Button';

interface FollowButtonProps {
  currentUid?: string; // Giriş yapmış kullanıcının ID'si (yoksa buton gizlenir)
  targetUid: string; // Profili görüntülenen kullanıcının ID'si
}

/** Bir kullanıcının profilinde gösterilen "Takip Et" / "Takip Ediliyor" butonu, takipçi/takip sayılarıyla birlikte. */
export function FollowButton({ currentUid, targetUid }: FollowButtonProps) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [followerCount, setFollowerCount] = useState<number | null>(null);
  const [followingCount, setFollowingCount] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    getFollowerCount(targetUid).then(setFollowerCount);
    getFollowingCount(targetUid).then(setFollowingCount);
    if (currentUid && currentUid !== targetUid) {
      checkIsFollowing(currentUid, targetUid).then(setFollowing);
    }
  }, [currentUid, targetUid]);

  async function handleToggle() {
    if (!currentUid) return;
    setIsLoading(true);
    try {
      if (following) {
        await unfollowUser(currentUid, targetUid);
        setFollowing(false);
        setFollowerCount((c) => (c ?? 1) - 1);
      } else {
        await followUser(currentUid, targetUid);
        setFollowing(true);
        setFollowerCount((c) => (c ?? 0) + 1);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const isOwnProfile = currentUid === targetUid;

  return (
    <div className="flex items-center gap-3">
      <span className="font-mono text-xs text-pitch-700/60 dark:text-pitch-100/50">
        <strong className="text-pitch-900 dark:text-pitch-100">{followerCount ?? '—'}</strong> takipçi ·{' '}
        <strong className="text-pitch-900 dark:text-pitch-100">{followingCount ?? '—'}</strong> takip
      </span>
      {currentUid && !isOwnProfile && following !== null && (
        <Button
          onClick={handleToggle}
          isLoading={isLoading}
          variant={following ? 'ghost' : 'primary'}
          className="!px-3 !py-1.5 text-xs"
        >
          {following ? 'Takip Ediliyor' : 'Takip Et'}
        </Button>
      )}
    </div>
  );
}
