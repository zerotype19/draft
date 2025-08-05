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
        setPlayers(data.results);
        setTotalPlayers(data.total_count);
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
      setPlayers(data.results);
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
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-7xl mx-auto p-6">
        <h1 className="text-4xl font-bold text-white mb-8">Draft Assistant</h1>

        {/* Modern Toolbar */}
        <div className="bg-gray-900 rounded-lg shadow-lg p-6 mb-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <label htmlFor="season" className="block text-sm font-medium text-gray-300 mb-2">
                  Season
                </label>
                <select 
                  id="season"
                  value={season} 
                  onChange={(e) => setSeason(Number(e.target.value))}
                  className="border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                </select>
              </div>

              <div>
                <label htmlFor="position" className="block text-sm font-medium text-gray-300 mb-2">
                  Position
                </label>
                <select 
                  id="position"
                  value={position} 
                  onChange={(e) => setPosition(e.target.value)}
                  className="border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

              <div className="text-sm text-gray-400">
                Showing {startIndex}-{endIndex} of {totalPlayers} players
              </div>
            </div>

            {/* Search input */}
            <div className="w-full lg:w-auto">
              <label htmlFor="search" className="block text-sm font-medium text-gray-300 mb-2">
                Search Players
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search player name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border border-gray-600 bg-gray-800 text-white rounded-md px-3 py-2 w-full lg:w-64 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handlePageChange(offset - limit)}
                disabled={!hasPrevPage || loading}
                className="px-4 py-2 border border-gray-600 bg-gray-800 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Previous
              </button>
              <span className="text-sm text-gray-400">
                Page {Math.floor(offset / limit) + 1}
              </span>
              <button 
                onClick={() => handlePageChange(offset + limit)}
                disabled={!hasNextPage || loading}
                className="px-4 py-2 border border-gray-600 bg-gray-800 text-white rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <p className="mt-4 text-gray-400">Loading rankings...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-900/20 border border-red-700 rounded-lg p-4 mb-6">
            <p className="text-red-400">Error: {error}</p>
          </div>
        )}

        {!loading && !error && filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-400">
              {searchTerm ? `No players found matching "${searchTerm}".` : "No players found for the selected criteria."}
            </p>
          </div>
        )}

        {!loading && !error && filteredPlayers.length > 0 && (
          <div className="bg-gray-900 rounded-lg shadow-lg overflow-hidden">
            <PlayerTable players={filteredPlayers} selectedPosition={position} />
          </div>
        )}
      </div>
    </div>
  );
} 