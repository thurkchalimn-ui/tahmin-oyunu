import { useState } from 'react';
import { generateShareCardBlob } from '@/utils/shareCard';
import { Button } from '@/components/common/Button';

interface ShareButtonProps {
  icon: string;
  headline: string;
  subtext: string;
  label?: string;
}

/**
 * Bir başarıyı (rozet, seri vb.) görsel bir kart olarak paylaşan buton.
 * Cihaz destekliyorsa (çoğu telefon tarayıcısı) doğrudan WhatsApp/Instagram
 * gibi uygulamaları içeren paylaşım menüsünü açar; desteklemiyorsa (çoğu
 * masaüstü tarayıcı) görseli doğrudan indirir, kullanıcı elle paylaşabilir.
 */
export function ShareButton({ icon, headline, subtext, label = 'Paylaş' }: ShareButtonProps) {
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleShare() {
    setError(null);
    setIsSharing(true);
    try {
      const blob = await generateShareCardBlob({ icon, headline, subtext });
      const file = new File([blob], 'tahmin-serisi-basari.png', { type: 'image/png' });

      const canUseShareApi =
        typeof navigator.share === 'function' &&
        typeof navigator.canShare === 'function' &&
        navigator.canShare({ files: [file] });

      if (canUseShareApi) {
        await navigator.share({ files: [file], title: 'Tahmin Serisi', text: headline });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tahmin-serisi-basari.png';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      // Kullanıcı paylaşım penceresini iptal ederse (AbortError) hata gösterme
      if (err instanceof Error && err.name !== 'AbortError') {
        setError('Paylaşılamadı, tekrar dener misin?');
      }
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="inline-flex flex-col">
      <Button onClick={handleShare} isLoading={isSharing} variant="ghost" className="!px-3 !py-1.5 text-xs">
        📤 {label}
      </Button>
      {error && <p className="mt-1 text-xs text-pick-wrong">{error}</p>}
    </div>
  );
}
