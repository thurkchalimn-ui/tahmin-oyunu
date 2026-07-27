import bgUrl from '@/assets/share-card-bg-v2.png';

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
  draw: (line: string, x: number, y: number) => void,
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

  lines.forEach((l, i) => draw(l, centerX, topY + i * lineHeight));
  return lines.length;
}

/**
 * Kullanıcının kendi hazırladığı "Tahmin Serisi" marka görselini (v2 - telefon
 * ve sosyal ikonlu tasarım) şablon olarak kullanıp, üst ve alt boşluklara
 * başarı metnini görselin altın/lacivert renk temasına uygun (kalın, ince
 * lacivert kontur + altın dolgu) bir stille bindirir.
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
  const NAVY = '#1B2A4A';
  const GOLD = '#D4AF37';

  // Üst boşluk (~90px yükseklik): ikon + başlık, görselin "TAHMİN SERİSİ"
  // yazısındakiyle aynı altın dolgu + lacivert ince kontur stiliyle
  const headlineText = `${options.icon} ${options.headline.toUpperCase()}`;
  ctx.font = 'bold 42px "Arial", sans-serif';
  ctx.lineWidth = 3;
  ctx.strokeStyle = NAVY;
  ctx.fillStyle = GOLD;

  wrapText(ctx, headlineText, centerX, 60, canvas.width - 100, 48, (line, x, y) => {
    ctx.strokeText(line, x, y);
    ctx.fillText(line, x, y);
  });

  // Alt boşluk: kullanıcı adı (lacivert, düz metin)
  ctx.fillStyle = NAVY;
  ctx.font = 'bold 30px "Arial", sans-serif';
  ctx.fillText(options.subtext, centerX, canvas.height - 40);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Görsel oluşturulamadı.'));
    }, 'image/png');
  });
}
