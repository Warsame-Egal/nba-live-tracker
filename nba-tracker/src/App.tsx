import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Box, Skeleton } from '@mui/material';
import AppShell from './components/AppShell';
import { LiveCountProvider } from './contexts/LiveCountContext';
import AgentChat from './components/AgentChat';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy load pages to improve initial load time
// Pages are only loaded when the user navigates to them
const Scoreboard = lazy(() => import('./pages/Scoreboard'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const RosterPage = lazy(() => import('./pages/RosterPage'));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'));
const Standings = lazy(() => import('./components/Standings'));
const Players = lazy(() => import('./pages/Players'));
const Teams = lazy(() => import('./pages/Teams'));
const Predictions = lazy(() => import('./pages/Predictions'));
const ComparePage = lazy(() => import('./pages/ComparePage'));
const GameDetail = lazy(() => import('./pages/GameDetail'));
const AgentPage = lazy(() => import('./pages/AgentPage'));
const NotFound = lazy(() => import('./pages/NotFound'));

const PageSkeleton = () => (
  <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
    <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 2 }} />
    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
    <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
  </Box>
);

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <Box
      key={location.pathname}
      sx={{
        animation: 'pageFadeIn 0.15s ease',
        '@keyframes pageFadeIn': {
          from: { opacity: 0, transform: 'translateY(6px)' },
          to: { opacity: 1, transform: 'none' },
        },
      }}
    >
      <Routes location={location}>
        <Route path="/" element={<Scoreboard />} />
        <Route path="/team/:team_id" element={<TeamPage />} />
        <Route path="/team/:team_id/roster" element={<RosterPage />} />
        <Route path="/standings/:season" element={<Standings />} />
        <Route path="/standings" element={<Standings />} />
        <Route path="/players" element={<Players />} />
        <Route path="/player/:playerId" element={<PlayerProfile />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/predictions" element={<Predictions />} />
        <Route path="/compare" element={<ComparePage />} />
        <Route path="/compare/:player1Id" element={<ComparePage />} />
        <Route path="/compare/:player1Id/:player2Id" element={<ComparePage />} />
        <Route path="/game/:gameId" element={<GameDetail />} />
        <Route path="/agent" element={<AgentPage />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Box>
  );
}

// Main app component with routing
export default function App() {
  return (
    <Router>
      <LiveCountProvider>
        <ErrorBoundary>
          <AppShell>
            <Suspense fallback={<PageSkeleton />}>
              <AnimatedRoutes />
            </Suspense>
            <AgentChat />
          </AppShell>
        </ErrorBoundary>
      </LiveCountProvider>
    </Router>
  );
}
