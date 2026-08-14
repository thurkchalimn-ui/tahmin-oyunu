import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';

const CONTACT_EMAIL = 'iletisim@tahminserisi.com';

/** "Bize Ulaşın" sayfası - kullanıcıların doğrudan mail göndermesi için basit bir yönlendirme sayfası. */
export function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8 font-body text-sm text-pitch-900 dark:text-pitch-100">
      <Link to="/" className="mb-4 inline-block font-mono text-xs text-scoreboard-amber">
        ← Ana sayfaya dön
      </Link>

      <h1 className="mb-1 font-display text-2xl font-semibold">Bize Ulaşın</h1>
      <p className="mb-6 font-mono text-xs text-pitch-700/50 dark:text-pitch-100/40">
        Soru, öneri ya da bir sorun mu var? Sana yardımcı olmaktan mutluluk duyarız.
      </p>

      <div className="flex flex-col gap-5">
        <section>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Uygulamayla ilgili her türlü soru, hata bildirimi, öneri ya da geri bildirim için
            aşağıdaki e-posta adresinden bize ulaşabilirsin. Genellikle birkaç gün içinde dönüş
            yapıyoruz.
          </p>
        </section>

        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="flex items-center justify-center gap-2 rounded-xl bg-scoreboard-amber px-6 py-4
            font-display text-base font-semibold text-pitch-950 shadow-glow transition hover:brightness-105"
        >
          <Mail size={18} />
          {CONTACT_EMAIL}
        </a>

        <section>
          <h2 className="mb-1 font-display text-base font-semibold">Sohbet Kanalı</h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Hızlı bir soru için uygulama içindeki{' '}
            <Link to="/sohbet" className="text-scoreboard-amber hover:underline">
              Sohbet
            </Link>{' '}
            kanalından bir admin ile de iletişime geçebilirsin.
          </p>
        </section>
      </div>
    </div>
  );
}
