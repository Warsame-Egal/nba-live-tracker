import * as Sentry from '@sentry/react';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeContextProvider } from './contexts/ThemeContext';
import './index.css';
import App from './App.tsx';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}

/**
 * Entry point of the React application.
 * Sets up the theme, CSS baseline, and renders the app.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Provide theme context with dark/light mode support */}
    <ThemeContextProvider>
      {/* Reset default browser styles and apply Material UI base styles */}
      <CssBaseline />
      {/* Main app component */}
      <App />
    </ThemeContextProvider>
  </StrictMode>,
);
