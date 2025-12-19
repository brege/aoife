import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import Favicon from './favicon';
import './social.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <div className="social-card">
      <div className="social-content">
        <div className="social-left">
          <div className="social-favicon">
            <Favicon />
          </div>
        </div>
        <div className="social-right">
          <h1 className="social-title">aoife</h1>
        </div>
      </div>
    </div>
  </StrictMode>,
);
