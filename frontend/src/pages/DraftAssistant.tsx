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
  
  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    setOffset(0); // Reset to first page when filters change
    
    getRankings(season, position, limit, 0)
      .then((data) => {
        setPlayers(data);
        setTotalPlayers(data.length); // For now, assume this is the total
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [season, position, limit]);

  // Handle pagination
  const handlePageChange = async (newOffset: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getRankings(season, position, limit, newOffset);
      setPlayers(data);
      setOffset(newOffset);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Filter players based on search term (client-side)
  const filteredPlayers = players.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startIndex = offset + 1;
  const endIndex = offset + filteredPlayers.length;
  const hasNextPage = filteredPlayers.length === limit;
  const hasPrevPage = offset > 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Draft Assistant</h1>

        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-wrap gap-4 items-center mb-4">
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
              Showing {startIndex}-{endIndex} of ~{totalPlayers} players
            </div>
          </div>

          {/* Search input */}
          <div className="mb-4">
            <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
              Search Players
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search player name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 w-full max-w-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Pagination controls */}
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handlePageChange(offset - limit)}
              disabled={!hasPrevPage || loading}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {Math.floor(offset / limit) + 1}
            </span>
            <button 
              onClick={() => handlePageChange(offset + limit)}
              disabled={!hasNextPage || loading}
              className="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
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

        {!loading && !error && filteredPlayers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {searchTerm ? `No players found matching "${searchTerm}".` : "No players found for the selected criteria."}
            </p>
          </div>
        )}

        {!loading && !error && filteredPlayers.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <PlayerTable players={filteredPlayers} />
          </div>
        )}
      </div>
    </div>
  );
} 