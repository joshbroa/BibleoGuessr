import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from '@/App';
import { AuthProvider } from '@/context/AuthContext';
import ErrorBoundary from '@/components/ErrorBoundary';
import { attachInteractionSounds } from '@/lib/sound';

// Overpass, self-hosted rather than fetched from Google Fonts, so visiting the
// site does not hand a reader's IP address to a third party the privacy policy
// does not name.
import '@fontsource/overpass/400.css';
import '@fontsource/overpass/500.css';
import '@fontsource/overpass/600.css';
import '@fontsource/overpass/700.css';
import '@fontsource/overpass/800.css';
// Tinos is metrically identical to Times New Roman, and the Bible pages are set
// in it on every device (see .scripture in index.css).
import '@fontsource/tinos/400.css';
import '@fontsource/tinos/700.css';
import '@/index.css';

// Every button and link gets a press sound from one listener, rather than each
// component wiring its own.
attachInteractionSounds(document);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
