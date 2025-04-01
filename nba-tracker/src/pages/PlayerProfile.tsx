import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PlayerSummary, PlayerGamePerformance } from "../types/player";
import { format } from 'date-fns';
import { enUS } from 'date-fns/locale';

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

  return (
    <div className="bg-black text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
          <div className="relative">
            <img
              src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.PERSON_ID}.png`}
              alt={fullName}
              className="w-full h-auto object-cover"
              onError={(e) => ((e.target as HTMLImageElement).src = "/fallback-player.png")}
            />
            <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black to-transparent p-6">
              <h2 className="text-3xl font-bold">{fullName}</h2>
              <p className="text-gray-300">
                {player.TEAM_NAME ?? "Free Agent"} ({player.POSITION ?? "N/A"})
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
            <div className="space-y-4">
              <PlayerStat label="Height" value={player.HEIGHT} />
              <PlayerStat label="Weight" value={player.WEIGHT} unit="lbs" />
              <PlayerStat label="College" value={player.COLLEGE} />
              <PlayerStat label="Country" value={player.COUNTRY} />
              <PlayerStat label="From Year" value={player.FROM_YEAR} />
              <PlayerStat label="To Year" value={player.TO_YEAR} />
            </div>

            <div className="space-y-4">
              <PlayerStat label="Points Per Game" value={player.PTS} />
              <PlayerStat label="Rebounds Per Game" value={player.REB} />
              <PlayerStat label="Assists Per Game" value={player.AST} />
            </div>
          </div>

          {player.recent_games && player.recent_games.length > 0 && (
            <div className="p-6">
              <h3 className="text-xl font-bold mb-4">Recent Games</h3>
              <ul className="space-y-2">
                {player.recent_games.map((game) => (
                  <GamePerformance key={game.game_id} game={game} />
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PlayerStat: React.FC<{ label: string; value?: number | string | null; unit?: string }> = ({ label, value, unit = "" }) => (
  <div className="p-4 bg-gray-800 rounded-lg shadow-inner">
    <p className="text-gray-400">{label}:</p>
    <p className="font-bold text-lg">{value !== null && value !== undefined ? value.toString() : "N/A"} {unit}</p>
  </div>
);

const GamePerformance: React.FC<{ game: PlayerGamePerformance }> = ({ game }) => {
  return (
    <li key={game.game_id} className="p-3 bg-gray-800 rounded-lg shadow-inner">
      <p className="text-sm">
        {format(new Date(game.date), 'PPP, MMM dd, yyyy', { locale: enUS })} - {game.opponent_team_abbreviation}: {game.points} PTS, {game.rebounds} REB, {game.assists} AST, {game.steals} STL, {game.blocks} BLK
      </p>
    </li>
  );
};

export default PlayerProfile;