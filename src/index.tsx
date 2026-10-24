import React from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { installClickTracking } from './lib/track';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

installClickTracking();
const app = <React.StrictMode><App /></React.StrictMode>;
if (rootElement.hasChildNodes() && window.location.hash !== '#/admin') {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}
