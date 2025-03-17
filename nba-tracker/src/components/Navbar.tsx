import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav className="bg-black py-4 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="text-xl font-bold text-white">NBA Scoreboard</Link>
        <div className="flex gap-6 text-gray-400">
          <Link to="/" className="hover:text-white">Home</Link>
          <Link to="/players" className="hover:text-white">Stats</Link>
          <Link to="/standings" className="hover:text-white">Standings</Link>
          <Link to="/players" className="hover:text-white">Teams</Link>
          <Link to="/players" className="hover:text-white">Players</Link>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
