import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite yapılandırması: React eklentisi + geliştirme sunucusu ayarları
export default defineConfig({
  plugins: [react()],
  resolve: {
    // '@/' -> 'src/'. tsconfig.json'daki "paths" sadece TypeScript tip kontrolü
    // içindir; Vite'ın bunları bundle sırasında çözebilmesi için burada da
    // tanımlanması gerekir, aksi halde "Failed to resolve import" hatası alınır.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    // Üretim build'inde büyük paketleri ayrı chunk'lara böl (performans optimizasyonu)
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
});
