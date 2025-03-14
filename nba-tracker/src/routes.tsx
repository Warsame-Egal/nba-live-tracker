import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import ScoreboardData from "./pages/Scoreboard";
import TeamPage from "./pages/TeamPage";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Route for the scoreboard page */}
        <Route path="/" element={<ScoreboardData />} />
        {/* Route for the team page */}
        <Route path="/team/:team_id/" element={<TeamPage />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
