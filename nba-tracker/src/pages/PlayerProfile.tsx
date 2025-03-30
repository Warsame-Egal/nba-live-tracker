import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { PlayerSummary } from "../types/Player";

const PlayerProfile = () => {
  const { playerId } = useParams<{ playerId: string }>();
  const [player, setPlayer] = useState<PlayerSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!playerId) return; // Prevent fetch if playerId is missing

    const fetchPlayer = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/v1/player/${playerId}`);
        if (!response.ok) throw new Error("Failed to fetch player");

        const data: PlayerSummary = await response.json();
        setPlayer(data);
      } catch (error) {
        console.error("Error fetching player details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPlayer();
  }, [playerId]);

  if (loading) return <p className="text-gray-400 text-center mt-4">Loading...</p>;
  if (!player) return <p className="text-gray-500 text-center mt-4">Player not found.</p>;

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-900 text-white rounded-lg shadow-lg">
      {/* Player Photo & Info */}
      <div className="text-center">
        <img 
          src={`https://cdn.nba.com/headshots/nba/latest/1040x760/${player.player_id}.png`} 
          alt={player.full_name} 
          className="w-32 h-32 rounded-lg mx-auto"
          onError={(e) => (e.currentTarget.src = "/fallback-player.png")}
        />
        <h2 className="text-2xl font-bold mt-2">{player.full_name}</h2>
        <p className="text-gray-300">
          {player.team_name ?? "Free Agent"} ({player.position ?? "N/A"})
        </p>
      </div>

      {/* Player Stats */}
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        <PlayerStat label="Height" value={player.height} />
        <PlayerStat label="Weight" value={player.weight} unit="lbs" />
        <PlayerStat label="Points Per Game" value={player.points_per_game} />
        <PlayerStat label="Rebounds Per Game" value={player.rebounds_per_game} />
        <PlayerStat label="Assists Per Game" value={player.assists_per_game} />
      </div>
    </div>
  );
};

/* Reusable Player Stat Component */
const PlayerStat = ({ label, value, unit = "" }: { label: string; value?: number | string; unit?: string }) => (
  <div className="p-4 bg-gray-800 rounded-lg">
    <p className="text-gray-400">{label}:</p>
    <p className="font-bold">{value ?? "N/A"} {unit}</p>
  </div>
);

export default PlayerProfile;
