import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { installNetlifyFetchInterceptor } from '@/weaver/signals/lib/api/installNetlifyFetchInterceptor.js';
import App from './App.jsx';

installNetlifyFetchInterceptor();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
