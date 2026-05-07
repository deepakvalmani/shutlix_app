import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './styles/globals.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#132C47',
            color: '#F9FAFB',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            fontSize: '14px',
            fontFamily: 'Inter, sans-serif',
          },
          success: {
            iconTheme: { primary: '#10B981', secondary: '#0D2137' },
          },
          error: {
            iconTheme: { primary: '#EF4444', secondary: '#0D2137' },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);