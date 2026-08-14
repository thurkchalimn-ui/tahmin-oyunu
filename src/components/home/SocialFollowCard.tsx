import { useState } from 'react';
import { Instagram, Twitter, Check, Star } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { claimSocialFollow } from '@/services/userService';

const INSTAGRAM_URL = 'https://www.instagram.com/tahminserisi/';
const TWITTER_URL = 'https://x.com/tahminserisi';

/**
 * Ana sayfadaki "Bizi Takip Et" kartı - Instagram/Twitter hesaplarımızı
 * takip eden kullanıcıya +25 XP kazandırır. ÖNEMLİ: Dürüstlük esaslı bir
 * sistem - gerçekten takip edildiği teknik olarak doğrulanmıyor (bunun için
 * Meta/X'in resmi API onayı gerekir). Kullanıcı linke tıklayıp geri
 * döndüğünde "Takip Ettim" diyerek XP'sini alır, her platform için en
 * fazla bir kez.
 */
export function SocialFollowCard() {
  const { profile, firebaseUser } = useAuth();
  const [claiming, setClaiming] = useState<'instagram' | 'twitter' | null>(null);

  if (!firebaseUser || !profile) return null;

  const claimed = profile.socialFollowClaimed ?? {};
  if (claimed.instagram && claimed.twitter) return null; // İkisi de alınmışsa kart tamamen kaybolur

  async function handleClaim(platform: 'instagram' | 'twitter', url: string) {
    window.open(url, '_blank', 'noopener,noreferrer');
    if (claimed[platform] || !firebaseUser) return;
    setClaiming(platform);
    try {
      await claimSocialFollow(firebaseUser.uid, platform);
    } finally {
      setClaiming(null);
    }
  }

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <h2 className="mb-1 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
        Bizi Takip Et
      </h2>
      <p className="mb-3 font-body text-xs text-pitch-700/60 dark:text-pitch-100/50">
        Takip ettiğin her hesap için <span className="font-bold text-scoreboard-amber">+25 XP</span> kazan.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => handleClaim('instagram', INSTAGRAM_URL)}
          disabled={claiming === 'instagram'}
          className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 font-display text-sm font-semibold transition ${
            claimed.instagram
              ? 'border-pick-correct/40 bg-pick-correct/10 text-pick-correct'
              : 'border-pitch-700/20 text-pitch-900 hover:bg-pitch-700/5 dark:border-pitch-700 dark:text-pitch-100 dark:hover:bg-pitch-700/30'
          }`}
        >
          {claimed.instagram ? <Check size={16} /> : <Instagram size={16} />}
          Instagram
          {!claimed.instagram && <Star size={12} className="text-scoreboard-amber" />}
        </button>

        <button
          type="button"
          onClick={() => handleClaim('twitter', TWITTER_URL)}
          disabled={claiming === 'twitter'}
          className={`flex items-center justify-center gap-2 rounded-lg border py-2.5 font-display text-sm font-semibold transition ${
            claimed.twitter
              ? 'border-pick-correct/40 bg-pick-correct/10 text-pick-correct'
              : 'border-pitch-700/20 text-pitch-900 hover:bg-pitch-700/5 dark:border-pitch-700 dark:text-pitch-100 dark:hover:bg-pitch-700/30'
          }`}
        >
          {claimed.twitter ? <Check size={16} /> : <Twitter size={16} />}
          Twitter
          {!claimed.twitter && <Star size={12} className="text-scoreboard-amber" />}
        </button>
      </div>
    </section>
  );
}
