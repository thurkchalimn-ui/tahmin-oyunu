import { Download, Share, PlusSquare, X } from 'lucide-react';
import { usePwaInstall } from '@/hooks/usePwaInstall';

/**
 * Siteye girince (kurulu değilse, daha önce kapatılmadıysa) görünen "Ana
 * Ekrana Ekle" banner'ı.
 *  - Android/Chrome: gerçek OTOMATİK kurulum - "Yükle" butonu native kurulum
 *    penceresini açar.
 *  - iOS: Apple'ın kısıtlaması nedeniyle otomatik kurulum İMKANSIZ - bunun
 *    yerine "Paylaş → Ana Ekrana Ekle" adımlarını gösteren bir talimat
 *    kartı gösterilir.
 */
export function InstallPrompt() {
  const { platform, shouldShow, promptInstall, dismiss } = usePwaInstall();

  if (!shouldShow) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-30 mx-auto max-w-sm rounded-xl border border-scoreboard-amber/40 bg-pitch-900 p-4 shadow-glow">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Kapat"
        className="absolute right-2 top-2 text-pitch-100/50 hover:text-pitch-100"
      >
        <X size={16} />
      </button>

      {platform === 'android-chrome' ? (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-scoreboard-amber/20">
            <Download size={18} className="text-scoreboard-amber" />
          </div>
          <div className="flex-1">
            <p className="font-display text-sm font-semibold text-pitch-100">Uygulamayı Yükle</p>
            <p className="font-body text-xs text-pitch-100/60">Ana ekranından tek dokunuşla eriş.</p>
          </div>
          <button
            type="button"
            onClick={promptInstall}
            className="shrink-0 rounded-lg bg-scoreboard-amber px-3 py-1.5 font-display text-xs font-semibold text-pitch-950"
          >
            Yükle
          </button>
        </div>
      ) : (
        <div className="pr-4">
          <p className="mb-2 font-display text-sm font-semibold text-pitch-100">📲 Ana Ekrana Ekle</p>
          <p className="flex flex-wrap items-center gap-1 font-body text-xs text-pitch-100/70">
            Alttaki <Share size={14} className="inline text-scoreboard-amber" /> paylaş simgesine dokun, sonra
            <PlusSquare size={14} className="inline text-scoreboard-amber" /> "Ana Ekrana Ekle" seçeneğine bas.
          </p>
        </div>
      )}
    </div>
  );
}
