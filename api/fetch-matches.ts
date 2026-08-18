import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Sunucu tarafı fonksiyonu: mackolik.com'un günlük maç verisini çeker ve
 * SADECE bizim 5 ligimize (Süper Lig, Premier Lig, LaLiga, Serie A, Ligue 1)
 * ait maçları filtreleyip döner. Bu, tarayıcıdan DOĞRUDAN çağrılamaz -
 * mackolik.com CORS politikası nedeniyle tarayıcı isteklerini reddeder, bu
 * yüzden istek sunucu (Vercel) üzerinden yapılıyor.
 *
 * Kaynak: mackolik_panel.py aracındaki LIVESCORES_URL ile aynı endpoint.
 */

interface MackolikCompetition {
  id: string;
  name: string;
  country: { name: string };
}

interface MackolikMatch {
  id: string;
  homeTeam: { name: string };
  awayTeam: { name: string };
  mstUtc: number;
  competitionId: string;
  state: string;
}

interface TargetLeague {
  country: string;
  name?: string;
  namePattern?: RegExp;
  exclude?: RegExp;
}

const TARGET_LEAGUES: TargetLeague[] = [
  { country: 'Türkiye', namePattern: /süper lig/i, exclude: /amatör/i },
  { country: 'İngiltere', name: 'Premier Lig' },
  { country: 'İspanya', name: 'LaLiga' },
  { country: 'İtalya', name: 'Serie A' },
  { country: 'Fransa', name: 'Ligue 1' },
];

// UEFA kupaları belirli bir ülkeye bağlı değil (uluslararası) - bu yüzden
// ülke şartı aranmadan, sadece isme göre eşleştiriliyor.
const TARGET_LEAGUE_NAMES_ANY_COUNTRY = new Set([
  'UEFA Şampiyonlar Ligi',
  'UEFA Avrupa Ligi',
  'UEFA Konferans Ligi',
]);

function matchesTargetLeague(comp: MackolikCompetition): boolean {
  const countryName = comp.country?.name ?? '';
  const leagueName = comp.name ?? '';

  if (TARGET_LEAGUE_NAMES_ANY_COUNTRY.has(leagueName)) return true;

  return TARGET_LEAGUES.some((t) => {
    if (t.country !== countryName) return false;
    if (t.namePattern) {
      if (t.exclude && t.exclude.test(leagueName)) return false;
      return t.namePattern.test(leagueName);
    }
    return t.name === leagueName;
  });
}

// ÖNEMLİ: mackolik.com'un döndürdüğü veri çok büyük (dünyadaki tüm ligler/
// maçlar, sadece bizim 5 ligimiz değil) - bunu çekip işlemek bazı günlerde
// Vercel'in varsayılan (10 saniye) süre sınırını aşabiliyor, bu da "502"
// hatasına yol açıyordu. Bu süreyi 30 saniyeye çıkarıyoruz (Vercel Hobby
// planında izin verilen en yüksek değer).
// ÖNEMLİ: Süre sınırı artık burada DEĞİL, proje kök dizinindeki vercel.json
// dosyasında ayarlanıyor - "export const config" yöntemi sadece Next.js
// projelerinde çalışıyor, bizim düz Vite + @vercel/node yapımızda hiçbir
// etkisi olmuyordu (502 hatasının asıl nedeni buydu).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);

  try {
    const url = `https://www.mackolik.com/perform/p0/ajax/components/competition/livescores/json?sports[]=Soccer&matchDate=${date}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        // ÖNEMLİ: mackolik.com, bazı isteklerde "Referer" başlığı olmadan
        // (özellikle güncel olmayan/başka bir tarih için sorgulandığında)
        // isteği reddedebiliyor - bu, "diğer tarihlerde yanıt vermedi"
        // sorununun olası nedeniydi. Gerçek tarayıcıdan gelen bir istek gibi
        // görünmesi için canlı sonuçlar sayfasını referer olarak ekliyoruz.
        Referer: 'https://www.mackolik.com/canli-sonuclar',
      },
    });
    if (!response.ok) {
      res.status(502).json({ error: `Mackolik yanıt vermedi (durum kodu: ${response.status}).` });
      return;
    }
    const data = await response.json();
    const competitions: Record<string, MackolikCompetition> = data?.data?.competitions ?? {};
    const matches: Record<string, MackolikMatch> = data?.data?.matches ?? {};

    const targetCompetitionIds = new Set(
      Object.entries(competitions)
        .filter(([, comp]) => matchesTargetLeague(comp))
        .map(([id]) => id),
    );

    const result = Object.values(matches)
      .filter((m) => targetCompetitionIds.has(m.competitionId))
      .map((m) => ({
        mackolikId: m.id,
        homeTeam: m.homeTeam?.name ?? '',
        awayTeam: m.awayTeam?.name ?? '',
        kickoffAt: new Date(m.mstUtc).toISOString(),
        league: competitions[m.competitionId]?.name ?? '',
        state: m.state,
      }))
      .filter((m) => m.homeTeam && m.awayTeam)
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

    res.status(200).json({ matches: result });
  } catch {
    res.status(500).json({ error: 'Maçlar çekilirken bir hata oluştu.' });
  }
}
