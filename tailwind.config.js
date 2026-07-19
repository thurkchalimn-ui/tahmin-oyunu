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
      },
    },
  },
  plugins: [],
};
