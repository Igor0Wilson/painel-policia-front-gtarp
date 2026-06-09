import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Interceptador global: redireciona /api/* para o backend separado na Vercel
const _originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const apiBase = import.meta.env.VITE_API_URL as string | undefined;
  if (apiBase && typeof input === 'string' && input.startsWith('/api')) {
    return _originalFetch(apiBase + input, { credentials: 'include', ...init });
  }
  return _originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
