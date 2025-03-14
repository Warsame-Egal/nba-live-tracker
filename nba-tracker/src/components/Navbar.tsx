import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <div className="bg-black py-4 shadow-lg">
      <nav className="max-w-7xl mx-auto px-4 flex justify-between items-center">
        <h1 className="text-xl font-bold text-white">NBA Scoreboard</h1>
        <div className="flex gap-6">
          <Link to="/" className="hover:text-white">Home</Link>
          <Link to="/players" className="hover:text-white">Stats</Link>
          <Link to="/players" className="hover:text-white">Standings</Link>
          <Link to="/players" className="hover:text-white">Teams</Link>
          <Link to="/players" className="hover:text-white">Players</Link>
        </div>
      </nav>
    </div>
  );
};

export default Navbar;
