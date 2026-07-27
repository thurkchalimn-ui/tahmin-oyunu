import bgUrl from '@/assets/share-card-bg.jpg';

interface ShareCardOptions {
  icon: string; // Küçük bir emoji (ör. 🏆, 🔥, 🎯)
  headline: string; // Ana başlık (ör. "15 MAÇLIK SERİ TAMAMLANDI!")
  subtext: string; // Alt metin (ör. kullanıcı adı)
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Arka plan görseli yüklenemedi.'));
    img.src = src;
  });
}

/** Metni verilen genişliğe göre satırlara böler (canvas'ta otomatik satır kaydırma yoktur). */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  topY: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line !== '') {
      lines.push(line.trim());
      line = `${word} `;
    } else {
      line = testLine;
    }
  }
  lines.push(line.trim());

  lines.forEach((l, i) => ctx.fillText(l, centerX, topY + i * lineHeight));
  return lines.length;
}

/**
 * Kullanıcının kendi hazırladığı "Tahmin Serisi" logo/marka görselini şablon
 * olarak kullanıp, görselin üst ve alt boşluklarına başarı metnini bindirir.
 * Görsel projenin kendi bundle'ının bir parçası olduğu için (yerel dosya,
 * harici bir URL değil) canvas'ı "kirletme" (CORS) sorunu yaşanmaz.
 */
export async function generateShareCardBlob(options: ShareCardOptions): Promise<Blob> {
  const bg = await loadImage(bgUrl);
  const canvas = document.createElement('canvas');
  canvas.width = bg.width;
  canvas.height = bg.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas desteklenmiyor.');

  ctx.drawImage(bg, 0, 0, canvas.width, canvas.height);
  ctx.textAlign = 'center';

  const centerX = canvas.width / 2;

  // Üst boşluğa: ikon + başlık (görselin logosu koyu renkte olduğu için
  // buradaki açık/beyaz zemine koyu yeşil metin kullanılır)
  ctx.font = '64px "Arial", sans-serif';
  ctx.fillText(options.icon, centerX, 90);

  ctx.fillStyle = '#16302A';
  ctx.font = 'bold 40px "Arial", sans-serif';
  wrapText(ctx, options.headline.toUpperCase(), centerX, 150, canvas.width - 140, 46);

  // Alt boşluğa: kullanıcı adı
  ctx.fillStyle = 'rgba(22,48,42,0.65)';
  ctx.font = '32px "Arial", sans-serif';
  ctx.fillText(options.subtext, centerX, canvas.height - 60);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Görsel oluşturulamadı.'));
    }, 'image/png');
  });
}
