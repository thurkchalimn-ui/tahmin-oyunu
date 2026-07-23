import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { enablePushNotifications } from '@/services/notificationService';
import { Button } from '@/components/common/Button';

/**
 * "Bildirimleri Aç" butonu - kullanıcıdan push bildirim izni ister ve FCM
 * token'ını kaydeder. Maç başlamasına 15 dakika kala (henüz tahmin
 * yapmadıysa) ve takip ettiği bir maç sonuçlandığında bildirim gönderilir
 * (bkz. automation/check-results.js). Profil sayfası gibi uygun bir yere
 * yerleştirilebilir.
 */
export function NotificationOptIn() {
  const { firebaseUser } = useAuth();
  const [status, setStatus] = useState<'idle' | 'granted' | 'denied' | 'unsupported'>('idle');

  if (!firebaseUser) return null;

  if (status === 'granted') {
    return (
      <p className="text-sm text-pitch-700/70 dark:text-pitch-100/60">
        Bildirimler açık ✅ - maç başlamadan ve sonuçlar geldiğinde haber vereceğiz.
      </p>
    );
  }

  async function handleClick() {
    const result = await enablePushNotifications(firebaseUser!.uid);
    setStatus(result);
  }

  return (
    <div className="flex flex-col gap-2">
      <Button variant="primary" onClick={handleClick}>
        Bildirimleri Aç
      </Button>
      {status === 'denied' && (
        <p className="text-sm text-pick-wrong">
          İzin verilmedi. Tarayıcı ayarlarından site bildirimlerine izin verip tekrar deneyebilirsin.
        </p>
      )}
      {status === 'unsupported' && (
        <p className="text-sm text-pitch-700/60 dark:text-pitch-100/50">
          Bu cihaz/tarayıcı push bildirimlerini desteklemiyor.
        </p>
      )}
    </div>
  );
}
