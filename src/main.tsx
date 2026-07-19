import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from '@/App';
import '@/index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Kök element (#root) bulunamadı. index.html dosyasını kontrol edin.');
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
