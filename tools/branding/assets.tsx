import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Favicon from './favicon';
import './assets.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <div className="assets-page">
      <div className="assets-canvas">
        <Favicon />
      </div>
    </div>
  </StrictMode>,
);
