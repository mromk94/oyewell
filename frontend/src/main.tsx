import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { CartProvider } from './lib/cart';
import { AuthProvider } from './lib/auth';
import App from './App';
import './index.css';
import Toaster from './components/Toast';

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch((e) => {
    console.warn('Service worker registration failed', e);
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <App />
          <Toaster />
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
