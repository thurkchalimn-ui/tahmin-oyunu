/** @type {import('tailwindcss').Config} */
export default {
  // Dark mode'u class bazlı yönetiyoruz (ThemeContext üzerinden <html> class'ı ekleniyor)
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Skorbord / stadyum gecesi teması
        pitch: {
          950: '#0B140F', // en koyu zemin (gece sahası)
          900: '#0E1A16',
          800: '#16241F',
          700: '#1F332B',
          100: '#FAFAF7', // açık mod zemini (çizgi beyazı)
        },
        scoreboard: {
          amber: '#F2B705', // ana vurgu - skorbord ışığı
          amberDark: '#C99404',
        },
        pick: {
          correct: '#4ADE80', // doğru tahmin
          wrong: '#E63946', // yanlış tahmin (kırmızı kart)
          pending: '#7C8B85', // henüz sonuçlanmamış
        },
      },
      fontFamily: {
        display: ['"Oswald"', 'sans-serif'], // başlıklar / skor rakamları
        body: ['"Inter"', 'sans-serif'], // gövde metni
        mono: ['"JetBrains Mono"', 'monospace'], // skorlar, seri sayaçları
      },
      boxShadow: {
        glow: '0 0 12px rgba(242, 183, 5, 0.55)',
        // Maç kartları için daha yumuşak, geniş bir "flood ışığı" gölgesi
        stadium: '0 8px 30px -8px rgba(242, 183, 5, 0.25), 0 2px 8px -2px rgba(11, 20, 15, 0.15)',
      },
      backgroundImage: {
        // Reklam görselindeki stadyum ışığı efekti: üstten süzülen, geniş ve
        // yumuşak iki adet altın parlaklık - sayfanın arka planına bindirilir.
        // Mevcut scoreboard.amber ve pitch.900 renkleriyle birebir uyumlu,
        // yeni bir renk eklemiyor - sadece o renklerin gradyanı.
        'stadium-glow':
          'radial-gradient(ellipse 70% 45% at 20% -15%, rgba(242, 183, 5, 0.16), transparent 60%),' +
          'radial-gradient(ellipse 60% 40% at 85% -10%, rgba(242, 183, 5, 0.10), transparent 65%)',
      },
    },
  },
  plugins: [],
};
