import { useEffect, useState } from 'react';
import { followUser, unfollowUser, isFollowing as checkIsFollowing } from '@/services/followService';
import { Button } from '@/components/common/Button';

interface FollowButtonProps {
  currentUid?: string; // Giriş yapmış kullanıcının ID'si (yoksa buton gizlenir)
  targetUid: string; // Profili görüntülenen kullanıcının ID'si
}

/** Bir kullanıcının profilinde gösterilen "Takip Et" / "Takip Ediliyor" butonu. */
export function FollowButton({ currentUid, targetUid }: FollowButtonProps) {
  const [following, setFollowing] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
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
      } else {
        await followUser(currentUid, targetUid);
        setFollowing(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  const isOwnProfile = currentUid === targetUid;
  if (!currentUid || isOwnProfile || following === null) return null;

  return (
    <Button
      onClick={handleToggle}
      isLoading={isLoading}
      variant={following ? 'ghost' : 'primary'}
      className="!px-3 !py-1.5 text-xs"
    >
      {following ? 'Takip Ediliyor' : 'Takip Et'}
    </Button>
  );
}
