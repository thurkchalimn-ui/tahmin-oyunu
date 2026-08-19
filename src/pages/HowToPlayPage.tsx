import { Link } from 'react-router-dom';
import { Flame, Star, Trophy, Award, Users, MessageCircle } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';

/**
 * "Nasıl Oynanır" sayfası - hem yeni kullanıcılara oyunu anlatmak hem de
 * Google'ın indeksleyebileceği gerçek, anlamlı metin içeriği sağlamak için
 * (SEO amaçlı - uygulamanın geri kalanı büyük ölçüde dinamik/etkileşimli
 * olduğu için arama motorlarının okuyabileceği az metin var, bu sayfa bunu
 * dengeliyor).
 */
export function HowToPlayPage() {
  usePageTitle('Nasıl Oynanır?');

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 font-body text-sm text-pitch-900 dark:text-pitch-100">
      <Link to="/" className="mb-4 inline-block font-mono text-xs text-scoreboard-amber">
        ← Ana sayfaya dön
      </Link>

      <h1 className="mb-1 font-display text-2xl font-semibold">Tahmin Serisi Nedir, Nasıl Oynanır?</h1>
      <p className="mb-6 text-pitch-700/70 dark:text-pitch-100/60">
        Tahmin Serisi, günlük futbol maçlarının sonuçlarını tahmin ederek seri yaptığın,
        rozet ve XP kazandığın, arkadaşlarınla yarıştığın ücretsiz bir tahmin oyunudur.
        Gerçek para veya bahis içermez - tamamen eğlence ve rekabet amaçlıdır.
      </p>

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
            <Flame size={16} className="text-scoreboard-amber" />
            1. Günlük Maçlara Tahmin Yap
          </h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Her gün, farklı liglerden seçilmiş maçlar için 1 (ev sahibi kazanır), X (beraberlik)
            veya 2 (deplasman kazanır) seçeneklerinden birini seçersin. Maç başlamadan önce
            tahminini yapman gerekir; maç başladıktan sonra o maça tahmin veremezsin.
          </p>
        </section>

        <section>
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
            <Trophy size={16} className="text-scoreboard-amber" />
            2. Seri Yap, Serini Büyüt
          </h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Art arda doğru tahmin yaptıkça "seri"n büyür. Bir yanlış tahmin serini sıfırlar,
            ama en yüksek seriyi ("en iyi seri") her zaman profilinde saklarsın. Oyunun adı
            da buradan geliyor - amaç, mümkün olduğunca uzun bir seri yapmak.
          </p>
        </section>

        <section>
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
            <Star size={16} className="text-scoreboard-amber" />
            3. XP Kazan, Seviye Atla
          </h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Doğru tahminler, rozetler, günlük giriş serisi, takipçi kazanmak ve arkadaş davet
            etmek XP (deneyim puanı) kazandırır. Topladığın XP arttıkça seviye atlarsın -
            uzun bir seri yapmak, kısa bir seriden çok daha fazla XP verir.
          </p>
        </section>

        <section>
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
            <Award size={16} className="text-scoreboard-amber" />
            4. Rozet Topla
          </h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Seri uzunluğu, günlük giriş devamlılığı, toplam doğru tahmin sayısı ve takipçi
            sayısı gibi kategorilerde rozetler kazanırsın. Profilindeki "Rozetler" sayfasından
            tüm kazanılan ve henüz kilitli olan rozetleri görebilirsin.
          </p>
        </section>

        <section>
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
            <Users size={16} className="text-scoreboard-amber" />
            5. Liderlik Tablosunda Yarış
          </h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Haftalık, aylık ve genel liderlik tablolarında diğer oyuncularla karşılaştırmalı
            sıralamanı görürsün. Arkadaşlarını takip edip onların profillerini, rozetlerini ve
            tahmin geçmişini de inceleyebilirsin.
          </p>
        </section>

        <section>
          <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold">
            <MessageCircle size={16} className="text-scoreboard-amber" />
            6. Sohbet Et
          </h2>
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Uygulama içindeki genel sohbet kanalından diğer oyuncularla maçlar hakkında
            konuşabilir, tahminlerini tartışabilirsin.
          </p>
        </section>

        <section className="rounded-xl border border-pitch-700/15 bg-gradient-to-b from-white to-pitch-100 p-4 dark:border-pitch-700 dark:from-pitch-800 dark:to-pitch-900">
          <p className="text-pitch-700/80 dark:text-pitch-100/70">
            Hazırsan hemen <Link to="/kayit" className="font-semibold text-scoreboard-amber hover:underline">ücretsiz kayıt ol</Link> ve
            bugünün maçlarına ilk tahminini yap!
          </p>
        </section>
      </div>
    </div>
  );
}
