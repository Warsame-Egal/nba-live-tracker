import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScoreboardData from "./pages/Scoreboard";
import TeamPage from "./pages/TeamPage";
import RosterPage from "./pages/RosterPage";
import Players from "./pages/Players";
import PlayerProfile from "./pages/PlayerProfile";
import Standings from './components/Standings';


export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route path="/" element={<ScoreboardData />} />
          <Route path="/team/:team_id" element={<TeamPage />} />
          <Route path="/team/:team_id/roster" element={<RosterPage />} />
          <Route path="/standings" element={<Standings />} />
          <Route path="/players" element={<Players />} />
          <Route path="/players/:playerId" element={<PlayerProfile />} />
        </Routes>
      </div>
    </Router>
  );
}
