import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Scoreboard from "./pages/Scoreboard";
import TeamPage from "./pages/TeamPage";
import RosterPage from "./pages/RosterPage";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <Routes>
          <Route path="/" element={<Scoreboard />} />
          <Route path="/team/:team_id" element={<TeamPage />} />
          <Route path="/team/:team_id/" element={<RosterPage />} />
        </Routes>
      </div>
    </Router>
  );
}
