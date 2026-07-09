import React from 'react';
import ReactDOM from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import { defineCustomElements } from '@trimble-oss/moduswebcomponents/loader';
import '@trimble-oss/moduswebcomponents/modus-wc-styles.css';
import '@trimble-oss/moduswebcomponents/modus-icons.css';
import './styles.css';
import App from './App';

// Register the Modus custom elements exactly once during initial load so the
// web components are upgraded before React mounts.
defineCustomElements();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    {/*
      Hash History is required for GitHub Pages: it keeps all routing in the URL
      fragment so deep links resolve against index.html and never 404 on a
      static-hosting sub-path.
    */}
    <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <App />
    </HashRouter>
  </React.StrictMode>
);
