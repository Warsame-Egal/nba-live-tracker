import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import ScoreboardData from './pages/Scoreboard';

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        {/* Route for the scoreboard page */}
        <Route path="/" element={<ScoreboardData />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
