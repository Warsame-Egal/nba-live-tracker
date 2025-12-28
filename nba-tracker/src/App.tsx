import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Box, CircularProgress } from '@mui/material';

const Scoreboard = lazy(() => import('./pages/Scoreboard'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const RosterPage = lazy(() => import('./pages/RosterPage'));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'));
const Standings = lazy(() => import('./components/Standings'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <Router>
      <Box>
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
          <Routes>
            <Route path="/" element={<Scoreboard />} />
            <Route path="/team/:team_id" element={<TeamPage />} />
            <Route path="/team/:team_id/roster" element={<RosterPage />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/players/:playerId" element={<PlayerProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </Box>
    </Router>
  );
}
