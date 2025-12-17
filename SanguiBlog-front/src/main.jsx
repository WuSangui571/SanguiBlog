import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

const EXTENSION_MESSAGE_ERROR =
  'A listener indicated an asynchronous response by returning true, but the message channel closed before a response was received';

if (typeof window !== 'undefined') {
  const guardKey = '__SANGUI_IGNORE_EXTENSION_MESSAGE_ERROR__';
  if (!window[guardKey]) {
    window[guardKey] = true;
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event?.reason;
      const message = typeof reason === 'string' ? reason : reason?.message;
      if (message && message.includes(EXTENSION_MESSAGE_ERROR)) {
        event.preventDefault();
      }
    });
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
