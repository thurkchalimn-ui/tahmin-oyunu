import { Link } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * Gizlilik Politikası ve Kullanım Şartları. Genel bir MVP metnidir; uygulama
 * mağazalarına gönderilecekse veya kullanıcı sayısı büyüdükçe bir hukuk
 * danışmanına gözden geçirtilmesi önerilir.
 */
export function PrivacyPolicyPage() {
  usePageTitle('Gizlilik Politikası');
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 font-body text-sm text-pitch-900 dark:text-pitch-100">
      <Link to="/" className="mb-4 inline-block font-mono text-xs text-scoreboard-amber">
        ← Ana sayfaya dön
      </Link>

      <h1 className="mb-1 font-display text-2xl font-semibold">Gizlilik Politikası ve Kullanım Şartları</h1>
      <p className="mb-6 font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
        Son güncelleme: {new Date().toLocaleDateString('tr-TR')}
      </p>

      <div className="flex flex-col gap-5">
        <section>
          <h2 className="mb-1 font-display text-base font-semibold">1. Topladığımız Bilgiler</h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Hesap oluşturduğunda e-posta adresini ve seçtiğin kullanıcı adını saklarız. Uygulamayı
            kullanırken oluşturduğun tahminler, seri istatistiklerin, seçtiğin profil görseli ve
            (izin verirsen) bildirim göndermek için cihaz bilgisi de saklanır.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base font-semibold">2. Bilgilerin Kullanımı</h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Bu bilgiler sadece uygulamanın temel işlevlerini (tahmin takibi, liderlik tablosu,
            bildirimler, sohbet) sağlamak için kullanılır. Bilgilerin hiçbiri satılmaz veya
            reklam amacıyla üçüncü taraflarla paylaşılmaz.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base font-semibold">3. Kullanılan Üçüncü Taraf Servisler</h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Verilerin barındırılması ve işlenmesi için Google Firebase (kimlik doğrulama, veritabanı,
            bildirimler), Vercel (site barındırma) ve GitHub Actions (arka plan bildirim/hatırlatma
            görevleri) kullanılır. Bu servislerin kendi gizlilik politikaları geçerlidir.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base font-semibold">4. Çerezler ve Yerel Depolama</h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Oturumunu açık tutmak ve tema tercihini (açık/koyu mod) hatırlamak için tarayıcının
            yerel depolama alanı kullanılır. Reklam takibi amaçlı çerez kullanılmaz.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base font-semibold">5. Haklarınız</h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Profil sayfandan istediğin zaman kullanıcı adını ve profil görselini değiştirebilir,
            bildirim tercihlerini yönetebilir ve hesabını (tüm kişisel verilerinle birlikte) kalıcı
            olarak silebilirsin. Hesap silme işlemi Profil sayfasındaki "Tehlikeli Bölge"
            bölümünden yapılır.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base font-semibold">6. Çocukların Gizliliği</h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Bu uygulama 13 yaş altındaki kullanıcılara yönelik değildir ve bilerek 13 yaş altı
            kullanıcılardan veri toplamaz.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base font-semibold">7. Kullanım Şartları</h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Uygulama, gerçek para veya ödül içermeyen, tamamen eğlence amaçlı bir tahmin oyunudur.
            Kullanıcılar; küfür, hakaret veya başkalarını rahatsız edici içerik paylaşmamayı,
            başkasının hesabını kullanmamayı ve sistemi kötüye kullanmamayı kabul eder. Kurallara
            uymayan hesaplar admin tarafından kısıtlanabilir.
          </p>
        </section>

        <section>
          <h2 className="mb-1 font-display text-base font-semibold">8. İletişim</h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Sorularınız için{' '}
            <Link to="/iletisim" className="text-scoreboard-amber hover:underline">
              Bize Ulaşın
            </Link>{' '}
            sayfasından bize e-posta gönderebilir ya da uygulama içindeki sohbet kanalından bir
            admin ile iletişime geçebilirsiniz.
          </p>
        </section>
      </div>
    </div>
  );
}
