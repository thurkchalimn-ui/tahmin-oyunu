import { useState } from 'react';
import { Gift, Copy, Check } from 'lucide-react';
import { IconBadge } from '@/components/common/IconBadge';

interface InviteFriendCardProps {
  uid: string;
}

/**
 * Profildeki "Arkadaş Davet Et" kartı - kullanıcının kendi davet linkini
 * (kayıt sayfasına ?ref=uid ile) gösterir, kopyalama ve paylaşma imkanı
 * sunar. Her başarılı davet, otomasyon script'i tarafından periyodik olarak
 * +25 XP olarak hesaba katılır (bkz. xpUtils.ts, check-results.js).
 */
export function InviteFriendCard({ uid }: InviteFriendCardProps) {
  const [copied, setCopied] = useState(false);
  const inviteLink = `${window.location.origin}/kayit?ref=${uid}`;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Pano erişimi başarısız olursa sessizce yoksay - kullanıcı linki elle seçip kopyalayabilir
    }
  }

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Tahmin Serisi',
          text: 'Tahmin Serisi\'ne katıl, maç sonuçlarını tahmin et, birlikte seri yapalım! ⚽',
          url: inviteLink,
        });
      } catch {
        // Kullanıcı paylaşımı iptal etti - sorun değil
      }
    } else {
      handleCopy();
    }
  }

  return (
    <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 shadow-stadium dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
      <h2 className="mb-1 flex items-center gap-2 font-display text-sm font-semibold text-pitch-900 dark:text-pitch-100">
        <IconBadge icon={<Gift size={16} />} size="sm" />
        Arkadaş Davet Et
      </h2>
      <p className="mb-3 font-body text-xs text-pitch-700/60 dark:text-pitch-100/50">
        Davet linkinle kayıt olan her arkadaşın için <span className="font-bold text-scoreboard-amber">+25 XP</span> kazanırsın.
      </p>

      <div className="flex items-center gap-2">
        <input
          readOnly
          value={inviteLink}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 truncate rounded-md border border-pitch-700/20 bg-transparent px-3 py-2 font-mono text-xs text-pitch-700/70 dark:border-pitch-700 dark:text-pitch-100/60"
        />
        <button
          type="button"
          onClick={handleCopy}
          title="Linki kopyala"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-pitch-700/20 text-pitch-900 transition hover:bg-pitch-700/5 dark:border-pitch-700 dark:text-pitch-100 dark:hover:bg-pitch-700/30"
        >
          {copied ? <Check size={15} className="text-pick-correct" /> : <Copy size={15} />}
        </button>
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="mt-3 w-full rounded-lg bg-scoreboard-amber py-2 font-display text-sm font-semibold text-pitch-950 shadow-glow transition hover:brightness-105"
      >
        Davet Linkini Paylaş
      </button>
    </section>
  );
}
