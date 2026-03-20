import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Box, Skeleton } from '@mui/material';
import AppShell from './components/AppShell';
import { LiveCountProvider } from './contexts/LiveCountContext';
import AgentChat from './components/AgentChat';

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
const NotFound = lazy(() => import('./pages/NotFound'));

const PageSkeleton = () => (
  <Box sx={{ maxWidth: 1400, mx: 'auto', px: { xs: 1, sm: 2, md: 3 }, py: 2 }}>
    <Skeleton variant="rectangular" height={80} sx={{ borderRadius: 2, mb: 2 }} />
    <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 2, mb: 2 }} />
    <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
  </Box>
);

// Main app component with routing
export default function App() {
  return (
    <Router>
      <LiveCountProvider>
        <AppShell>
          <Suspense fallback={<PageSkeleton />}>
            {/* Define all the routes */}
            <Routes>
              {/* Home page - shows the scoreboard */}
              <Route path="/" element={<Scoreboard />} />
              {/* Team page - shows team details */}
              <Route path="/team/:team_id" element={<TeamPage />} />
              {/* Roster page - shows team roster */}
              <Route path="/team/:team_id/roster" element={<RosterPage />} />
              {/* Standings page - shows league standings */}
              <Route path="/standings/:season" element={<Standings />} />
              <Route path="/standings" element={<Standings />} />
              {/* Players page - shows season leaders and player search */}
              <Route path="/players" element={<Players />} />
              {/* Player profile page - shows player details */}
              <Route path="/player/:playerId" element={<PlayerProfile />} />
              {/* Teams page - shows team statistics */}
              <Route path="/teams" element={<Teams />} />
              {/* Predictions page - shows AI-powered game predictions */}
              <Route path="/predictions" element={<Predictions />} />
              {/* Compare page - side-by-side player comparison */}
              <Route path="/compare" element={<ComparePage />} />
              <Route path="/compare/:player1Id" element={<ComparePage />} />
              <Route path="/compare/:player1Id/:player2Id" element={<ComparePage />} />
              {/* Game detail page - full game page with score, box score, key moments, AI summary */}
              <Route path="/game/:gameId" element={<GameDetail />} />
              {/* 404 page - shows when user goes to a page that doesn't exist */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <AgentChat />
        </AppShell>
      </LiveCountProvider>
    </Router>
  );
}
