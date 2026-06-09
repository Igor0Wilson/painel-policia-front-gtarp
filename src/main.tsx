import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Interceptador global: redireciona /api/* para o backend separado na Vercel
const _originalFetch = window.fetch.bind(window);
window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
  const apiBase = import.meta.env.VITE_API_URL as string | undefined;
  
  if (apiBase && typeof input === 'string' && input.startsWith('/api')) {
    const token = localStorage.getItem('auth_token');
    const customHeaders = new Headers(init?.headers);
    if (token) {
      customHeaders.set('Authorization', `Bearer ${token}`);
    }

    return _originalFetch(apiBase + input, { 
      ...init,
      credentials: 'include',
      headers: customHeaders
    });
  }
  return _originalFetch(input, init);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
