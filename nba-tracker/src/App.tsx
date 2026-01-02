import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';

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
const NotFound = lazy(() => import('./pages/NotFound'));

// Main app component with routing
export default function App() {
  return (
    <Router>
      <Box>
        {/* Show loading spinner while a page is being loaded */}
        <Suspense
          fallback={
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
              }}
            >
              <CircularProgress />
            </Box>
          }
        >
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
            {/* 404 page - shows when user goes to a page that doesn't exist */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Box>
    </Router>
  );
}
