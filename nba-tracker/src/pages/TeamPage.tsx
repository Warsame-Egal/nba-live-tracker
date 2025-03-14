import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { TeamDetails } from "../types/team";

const TeamPage = () => {
  // Get the team_id from the URL parameters
  const { team_id } = useParams<{ team_id: string }>();
  // State to hold the team details data
  const [teamDetails, setTeamDetails] = useState<TeamDetails | null>(null);
  // State to manage loading status
  const [loading, setLoading] = useState(true);
  // State to manage error messages
  const [error, setError] = useState<string | null>(null);

  // Fetch the team details data when the component mounts or team_id changes
  useEffect(() => {
    async function fetchTeamDetails() {
      try {
        const response = await fetch(
          `http://localhost:8000/api/v1/scoreboard/team/${team_id}`
        );

        if (!response.ok) throw new Error("Failed to fetch team details");

        const data = await response.json();
        setTeamDetails(data);
      } catch (error) {
        console.error("Error fetching team details:", error);
        setError("Failed to load team details.");
      } finally {
        setLoading(false);
      }
    }

    fetchTeamDetails();
  }, [team_id]);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {loading ? (
        // Show loading message while fetching data
        <p className="loading">Loading team data...</p>
      ) : error ? (
        
        <p className="text-center text-red-400">{error}</p>
      ) : (
        <div className="container">
          <div className="team-details-container">
            <div className="team-header">
              <div>
                <h1 className="team-name-large">{teamDetails?.team_name}</h1>
                <p className="team-meta">
                  {teamDetails?.conference} Conference - {teamDetails?.division} Division
                </p>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="mt-6 border-b border-gray-700 pb-3 flex gap-6 text-gray-400">
              <Link to="/" className="hover:text-white">
                Home
              </Link>
              <Link to={`/team/${team_id}/roster`} className="hover:text-white">
                Roster
              </Link>
              <Link to={`/team/${team_id}/schedule`} className="hover:text-white">
                Schedule
              </Link>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamPage;