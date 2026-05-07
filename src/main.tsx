/// <reference types="vite/client" />
import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register SW
const shouldRegisterSW = import.meta.env.PROD || import.meta.env.VITE_ENABLE_SW === 'true';

if ('serviceWorker' in navigator && shouldRegisterSW) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(reg => {
      console.log('SW Registered:', reg.scope);
    }).catch(err => {
      console.error('SW Registration failed:', err);
    });
  });
}
