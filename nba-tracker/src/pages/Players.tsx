import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import { PlayerSummary } from "../types/Player";

const Players = () => {
  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  useEffect(() => {
    if (!searchQuery) return;

    const fetchPlayers = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:8000/api/v1/players/search?name=${searchQuery}`);
        if (!response.ok) throw new Error("Failed to fetch players");

        const data: PlayerSummary[] = await response.json();
        setPlayers(data);
      } catch (error) {
        console.error("Error fetching players:", error);
        setPlayers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayers();
  }, [searchQuery]);

  return (
    <div className="max-w-7xl mx-auto p-4">
      {/* Players Page Search Bar */}
      <SearchBar setSearchQuery={(query) => setSearchParams({ search: query })} />

      {/* Loading Indicator */}
      {loading && <p className="text-gray-400 text-center mt-4">Searching...</p>}

      {/* Player List */}
      <ul className="mt-4 space-y-2">
        {players.length > 0 ? (
          players.map((player) => <PlayerCard key={player.player_id} player={player} />)
        ) : (
          <p className="text-gray-500 text-center mt-4">No players found.</p>
        )}
      </ul>
    </div>
  );
};

/* Reusable PlayerCard Component */
const PlayerCard = ({ player }: { player: PlayerSummary }) => (
  <li className="p-3 bg-gray-800 rounded-lg shadow-md flex items-center gap-4">
    <img
      src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.player_id}.png`}
      alt={player.full_name}
      className="w-16 h-16 rounded-lg object-cover"
      onError={(e) => (e.currentTarget.src = "/fallback-player.png")}
    />
    <div className="flex-1">
      <Link to={`/players/${player.player_id}`} className="text-white font-bold hover:underline">
        {player.full_name}
      </Link>
      <p className="text-gray-300 text-sm">
        {player.team_abbreviation ?? "FA"} ({player.position ?? "N/A"})
      </p>
    </div>
  </li>
);

export default Players;
