import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Suspense, lazy } from 'react';

const Scoreboard = lazy(() => import('./pages/Scoreboard'));
const TeamPage = lazy(() => import('./pages/TeamPage'));
const RosterPage = lazy(() => import('./pages/RosterPage'));
const PlayerProfile = lazy(() => import('./pages/PlayerProfile'));
const Standings = lazy(() => import('./components/Standings'));
const NotFound = lazy(() => import('./pages/NotFound'));

export default function App() {
  return (
    <Router>
      <div className="">
        <Routes>
          <Route path="/" element={<Scoreboard />} />
          <Route path="/team/:team_id" element={<TeamPage />} />
          <Route path="/team/:team_id/roster" element={<RosterPage />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/players/:playerId" element={<PlayerProfile />} />
        </Routes>
        <Suspense fallback={<div className="text-center p-8 text-white">Loading...</div>}>
          <Routes>
            <Route path="/" element={<Scoreboard />} />
            <Route path="/team/:team_id" element={<TeamPage />} />
            <Route path="/team/:team_id/roster" element={<RosterPage />} />
            <Route path="/standings" element={<Standings />} />
            <Route path="/players/:playerId" element={<PlayerProfile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
    </Router>
  );
}