import { useState, useEffect } from "react";
import PlayerTable from "../components/PlayerTable";
import { getRankings } from "../lib/api";
import type { Player } from "../lib/api";

// Professional Fantasy Draft Assistant with Dark/Light Mode - Updated for deployment - CSS FIXED - THEME DEBUG
export default function DraftAssistant() {
  const [season, setSeason] = useState(2024);
  const [position, setPosition] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(true);
  
  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState("");
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);

  // Theme toggle handler with console logging
  const toggleTheme = () => {
    const newMode = !darkMode;
    console.log('Theme toggle clicked! Current:', darkMode, 'New:', newMode);
    console.log('Button clicked at:', new Date().toISOString());
    setDarkMode(newMode);
    
    // Force a re-render to ensure the change is applied
    setTimeout(() => {
      console.log('Theme state after toggle:', newMode);
      console.log('Dark class should be:', newMode ? 'dark' : '');
    }, 100);
  };

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
  const totalPages = Math.ceil(totalPlayers / limit);
  const currentPage = Math.floor(offset / limit) + 1;

  return (
    <div className={`min-h-screen ${darkMode ? 'dark' : ''} bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-white`}>
      <div className="max-w-7xl mx-auto p-6">
        {/* Header with Theme Toggle */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Draft Assistant</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600 dark:text-gray-300">
              {darkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
            </span>
            <button
              onClick={toggleTheme}
              className="px-4 py-2 rounded-lg font-medium transition-colors bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 shadow-sm border border-gray-300 dark:border-gray-600"
            >
              {darkMode ? '☀️ Switch to Light' : '🌙 Switch to Dark'}
            </button>
            <span className={`text-xs px-2 py-1 rounded ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700'}`}>
              {darkMode ? 'DARK' : 'LIGHT'}
            </span>
          </div>
        </div>

        {/* Modern Toolbar */}
        <div className="rounded-xl shadow-lg p-6 mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          {/* Filters Row */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <label htmlFor="season" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Season
                </label>
                <select 
                  id="season"
                  value={season} 
                  onChange={(e) => setSeason(Number(e.target.value))}
                  className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                </select>
              </div>

              <div>
                                <label htmlFor="position" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                  Position
                </label>
                <select 
                  id="position"
                  value={position} 
                  onChange={(e) => setPosition(e.target.value)}
                  className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
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
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {startIndex}-{endIndex} of {totalPlayers} players
              </div>
            </div>

            {/* Search input */}
            <div className="w-full lg:w-auto">
              <label htmlFor="search" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                Search Players
              </label>
              <input
                id="search"
                type="text"
                placeholder="Search player name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="border rounded-lg px-4 py-2 w-full lg:w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handlePageChange(offset - limit)}
                disabled={!hasPrevPage || loading}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                ← Previous
              </button>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => handlePageChange(offset + limit)}
                disabled={!hasNextPage || loading}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Next →
              </button>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              Loading rankings...
            </p>
          </div>
        )}

        {error && (
          <div className="rounded-lg p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700">
            <p className="text-red-800 dark:text-red-400">
              Error: {error}
            </p>
          </div>
        )}

        {!loading && !error && filteredPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? `No players found matching "${searchTerm}".` : "No players found for the selected criteria."}
            </p>
          </div>
        )}

        {!loading && !error && filteredPlayers.length > 0 && (
          <div className="rounded-xl shadow-lg overflow-hidden bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
            <PlayerTable players={filteredPlayers} selectedPosition={position} />
          </div>
        )}
      </div>
    </div>
  );
} 