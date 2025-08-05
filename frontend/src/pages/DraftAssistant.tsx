import { useState, useEffect } from "react";
import PlayerTable from "../components/PlayerTable";
import { getRankings } from "../lib/api";
import type { Player } from "../lib/api";

export default function DraftAssistant() {
  const [season, setSeason] = useState(2024);
  const [position, setPosition] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    
    getRankings(season, position)
      .then((data) => setPlayers(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [season, position]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Draft Assistant</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label htmlFor="season" className="block text-sm font-medium text-gray-700 mb-1">
                Season
              </label>
              <select 
                id="season"
                value={season} 
                onChange={(e) => setSeason(Number(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={2023}>2023</option>
                <option value={2024}>2024</option>
              </select>
            </div>

            <div>
              <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-1">
                Position
              </label>
              <select 
                id="position"
                value={position} 
                onChange={(e) => setPosition(e.target.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Positions</option>
                <option value="QB">QB</option>
                <option value="RB">RB</option>
                <option value="WR">WR</option>
                <option value="TE">TE</option>
                <option value="K">K</option>
                <option value="DEF">DEF</option>
              </select>
            </div>

            <div className="text-sm text-gray-600">
              Showing {players.length} players
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading rankings...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {!loading && !error && players.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">No players found for the selected criteria.</p>
          </div>
        )}

        {!loading && !error && players.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <PlayerTable players={players} />
          </div>
        )}
      </div>
    </div>
  );
} 