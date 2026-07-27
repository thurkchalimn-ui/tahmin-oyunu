interface ShareCardOptions {
  icon: string; // Büyük gösterilecek emoji (ör. 🏆, 🔥, 🎯)
  headline: string; // Ana başlık (ör. "15 MAÇLIK SERİ TAMAMLANDI!")
  subtext: string; // Alt metin (ör. kullanıcı adı)
}

/** Metni verilen genişliğe göre satırlara böler (canvas'ta otomatik satır kaydırma yoktur). */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  centerY: number,
  maxWidth: number,
  lineHeight: number,
) {
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

  const startY = centerY - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, centerX, startY + i * lineHeight));
}

/**
 * Instagram/WhatsApp'ta paylaşılabilecek, oyunun skorbord temasına uygun
 * kare (1080x1080) bir başarı kartı görseli oluşturur. Kullanıcı avatarı
 * BİLİNÇLİ OLARAK dahil edilmez - harici görsellerin CORS kısıtlamaları
 * canvas'ı "kirletip" görselin dışa aktarılamamasına yol açabilirdi; bunun
 * yerine sade, garanti çalışan bir emoji/metin tasarımı kullanılır.
 */
export async function generateShareCardBlob(options: ShareCardOptions): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1080;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas desteklenmiyor.');

  // Arka plan: koyu yeşil gradyan (sahayı andıran)
  const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  bgGradient.addColorStop(0, '#0E1A16');
  bgGradient.addColorStop(1, '#16302A');
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Üstte hafif amber parlaklık efekti (skorbord ışığı hissi)
  const glow = ctx.createRadialGradient(540, 280, 40, 540, 280, 620);
  glow.addColorStop(0, 'rgba(242,183,5,0.18)');
  glow.addColorStop(1, 'rgba(242,183,5,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.textAlign = 'center';

  // Üst marka
  ctx.fillStyle = '#F2B705';
  ctx.font = 'bold 38px "Arial", sans-serif';
  ctx.fillText('⚽ TAHMİN SERİSİ', 540, 130);

  // Büyük ikon
  ctx.font = '260px "Arial", sans-serif';
  ctx.fillText(options.icon, 540, 500);

  // Ana başlık (uzunsa otomatik satır kaydırma)
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 68px "Arial", sans-serif';
  wrapText(ctx, options.headline, 540, 660, 920, 82);

  // Alt metin (kullanıcı adı vb.)
  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  ctx.font = '34px "Arial", sans-serif';
  ctx.fillText(options.subtext, 540, 940);

  // Alt çizgi/köşe süsü
  ctx.strokeStyle = 'rgba(242,183,5,0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(390, 980);
  ctx.lineTo(690, 980);
  ctx.stroke();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Görsel oluşturulamadı.'));
    }, 'image/png');
  });
}
