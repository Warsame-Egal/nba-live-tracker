import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { theme } from './theme';
import './index.css';
import App from './App.tsx';

/**
 * Entry point of the React application.
 * Sets up the theme, CSS baseline, and renders the app.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Provide Material UI theme to all components */}
    <ThemeProvider theme={theme}>
      {/* Reset default browser styles and apply Material UI base styles */}
      <CssBaseline />
      {/* Main app component */}
      <App />
    </ThemeProvider>
  </StrictMode>,
);
