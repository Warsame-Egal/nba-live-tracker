import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PlayerSummary } from "../types/player";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import Navbar from "../components/Navbar";

const PlayerProfile: React.FC = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!playerId) return;

    const fetchPlayer = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`http://localhost:8000/api/v1/player/${playerId}`);
        if (!response.ok) throw new Error("Failed to fetch player");
        const data: PlayerSummary = await response.json();
        setPlayer(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId]);

  if (loading) return <p className="text-gray-400 text-center mt-4">Loading...</p>;
  if (error) return <p className="text-red-500 text-center mt-4">{error}</p>;
  if (!player) return <p className="text-gray-500 text-center mt-4">Player not found.</p>;

  const fullName = `${player.PLAYER_FIRST_NAME} ${player.PLAYER_LAST_NAME}`;
  const experience = player.FROM_YEAR && player.TO_YEAR ? `${player.TO_YEAR - player.FROM_YEAR} Years` : "N/A";

  return (
    <div className="min-h-screen bg-black -to-b from-gray-900 to-black text-white relative">
      <Navbar />
    <div className="bg-black -to-b from-gray-900 to-black text-white min-h-screen font-sans">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
          {/* Player Image */}
          <div className="w-52 h-auto">
            <img
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.PERSON_ID}.png`}
              alt={fullName}
              className="rounded-md w-full"
              onError={(e) => ((e.target as HTMLImageElement).src = "/fallback-player.png")}
            />
          </div>

          {/* Player Info */}
          <div className="flex-1 text-center md:text-left space-y-3">
          <h1 className="text-3xl font-bold leading-tight">
              {player.PLAYER_FIRST_NAME}<br />{player.PLAYER_LAST_NAME}
            </h1>
            <p className="text-sm text-gray-300 uppercase">
              {player.TEAM_NAME ?? "Free Agent"} | #{player.JERSEY_NUMBER ?? "N/A"} | {player.POSITION ?? "N/A"}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm mt-4">
              <p><span className="text-gray-400 uppercase">Height:</span> {player.HEIGHT ?? "N/A"}</p>
              <p><span className="text-gray-400 uppercase">Weight:</span> {player.WEIGHT ? `${player.WEIGHT} lb` : "N/A"}</p>
              <p><span className="text-gray-400 uppercase">Country:</span> {player.COUNTRY ?? "N/A"}</p>
              <p><span className="text-gray-400 uppercase">College:</span> {player.COLLEGE ?? "N/A"}</p>
              <p><span className="text-gray-400 uppercase">Experience:</span> {experience}</p>
            </div>
          </div>
        </div>

        {/* PPG / RPG / APG */}
        <div className="grid grid-cols-3 text-center mt-10 border-t border-neutral-700 pt-6">
          <Stat label="PPG" value={player.PTS} />
          <Stat label="RPG" value={player.REB} />
          <Stat label="APG" value={player.AST} />
        </div>

        {/* Recent Games */}
        {player.recent_games && player.recent_games.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4 text-gray-200">Last 5 Games</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left table-auto border border-neutral-700">
                <thead className="bg-black -800 border-b border-neutral-700">
                  <tr>
                    <th className="text-xs font-semibold text-gray-300 p-2">DATE</th>
                    <th className="text-xs font-semibold text-gray-300 p-2">OPP</th>
                    <th className="text-xs font-semibold text-gray-300 p-2">PTS</th>
                    <th className="text-xs font-semibold text-gray-300 p-2">REB</th>
                    <th className="text-xs font-semibold text-gray-300 p-2">AST</th>
                    <th className="text-xs font-semibold text-gray-300 p-2">STL</th>
                    <th className="text-xs font-semibold text-gray-300 p-2">BLK</th>
                  </tr>
                </thead>
                <tbody>
                  {player.recent_games.map((game) => (
                    <tr key={game.game_id} className="border-b border-neutral-700 hover:bg-black -800 transition">
                      <td className="text-xs p-2">{format(new Date(game.date), 'MMM dd, yyyy', { locale: enUS })}</td>
                      <td className="text-xs p-2">{game.opponent_team_abbreviation}</td>
                      <td className="text-xs p-2">{game.points}</td>
                      <td className="text-xs p-2">{game.rebounds}</td>
                      <td className="text-xs p-2">{game.assists}</td>
                      <td className="text-xs p-2">{game.steals}</td>
                      <td className="text-xs p-2">{game.blocks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value?: number }> = ({ label, value }) => (
  <div>
    <p className="text-xs text-gray-400 uppercase">{label}</p>
    <p className="text-2xl font-bold">{value ?? "N/A"}</p>
  </div>
);

export default PlayerProfile;
