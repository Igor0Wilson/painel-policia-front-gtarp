import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Interceptador Global de Fetch para redirecionar requests da API para o Backend separado
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  const apiUrl = import.meta.env.VITE_API_URL;
  if (apiUrl && typeof resource === 'string' && resource.startsWith('/api')) {
    resource = `${apiUrl}${resource}`;
  }
  
  // Garantir que cookies e credenciais sejam enviados em requisições cross-origin
  if (typeof resource === 'string' && resource.startsWith('http')) {
    config = { ...config, credentials: 'include' }; 
  }
  
  return originalFetch(resource, config);
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
