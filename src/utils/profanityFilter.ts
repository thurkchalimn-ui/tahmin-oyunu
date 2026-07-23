/**
 * Basit bir uygunsuz kelime filtresi. Tam kapsamlı bir çözüm değildir (böyle
 * bir liste hiçbir zaman %100 eksiksiz olamaz), ama en yaygın küfür/argo
 * kelimeleri ve bunların boşluk/özel karakterle gizlenmiş hallerini yakalar.
 * Kullanıcı adı, sohbet gibi serbest metin alanlarında temel bir koruma sağlar.
 */
const FORBIDDEN_WORDS = [
  'amk',
  'aq',
  'oç',
  'oc',
  'orospu',
  'piç',
  'pic',
  'yavşak',
  'yavsak',
  'göt',
  'got',
  'sik',
  'siktir',
  'ibne',
  'gavat',
  'şerefsiz',
  'serefsiz',
  'pezevenk',
  'kahpe',
  'sürtük',
  'surtuk',
  'ananı',
  'anani',
  'mal',
  'salak',
  'gerizekalı',
  'gerizekali',
  'fuck',
  'shit',
  'bitch',
  'asshole',
];

/** Metni karşılaştırılabilir hale getirir (küçük harf, aksan/boşluk/özel karakter temizliği). */
function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Verilen metnin bilinen bir uygunsuz kelime içerip içermediğini kontrol eder. */
export function containsProfanity(text: string): boolean {
  const normalized = normalize(text);
  if (!normalized) return false;
  return FORBIDDEN_WORDS.some((word) => normalized.includes(word));
}
