import { useState, useEffect } from 'react';
import { getRankings, getDraftRankings, getRecommendations, getWaivers } from '../lib/api';
import type { Player, DraftPlayer, RecommendationPlayer, WaiverPlayer } from '../lib/api';
import PlayerTable from '../components/PlayerTable';
import PlayerModal from '../components/PlayerModal';
import DraftRankingsTable from '../components/DraftRankingsTable';
import RecommendationsTable from '../components/RecommendationsTable';
import WaiversTable from '../components/WaiversTable';
import LeagueSetup from './LeagueSetup';
import { hasLeagueSettings, getLeagueSettings, getRoster, formatScoringForAPI } from '../lib/localStorage';

// Professional Fantasy Draft Assistant with Dark/Light Mode - Updated for deployment - CSS FIXED - THEME DEBUG
export default function DraftAssistant() {
  const [season, setSeason] = useState(() => {
    const saved = localStorage.getItem('draft-season');
    return saved ? parseInt(saved) : 2024;
  });
  const [position, setPosition] = useState(() => {
    return localStorage.getItem('draft-position') || "";
  });
  const [players, setPlayers] = useState<Player[]>([]);
  const [draftPlayers, setDraftPlayers] = useState<DraftPlayer[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationPlayer[]>([]);
  const [waivers, setWaivers] = useState<WaiverPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('draft-dark-mode');
    return saved ? JSON.parse(saved) : true;
  });
  
  // Search and pagination state
  const [searchTerm, setSearchTerm] = useState(() => {
    return localStorage.getItem('draft-search') || "";
  });
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [totalPlayers, setTotalPlayers] = useState(0);
  
  // Sort state with localStorage persistence
  const [sortColumn, setSortColumn] = useState(() => {
    return localStorage.getItem('draft-sort-column') || 'total_points';
  });
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(() => {
    const saved = localStorage.getItem('draft-sort-direction');
    return (saved === 'asc' || saved === 'desc') ? saved : 'desc';
  });

  // Modal state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Watchlist state
  const [watchlist, setWatchlist] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('draft-watchlist');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [showWatchlistOnly, setShowWatchlistOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<'rankings' | 'draft' | 'recommendations' | 'waivers' | 'league-setup'>('rankings');

  const [week, setWeek] = useState(18);

  // Check if league settings exist and redirect if needed
  useEffect(() => {
    if (!hasLeagueSettings() && (activeTab === 'draft' || activeTab === 'recommendations' || activeTab === 'waivers')) {
      setActiveTab('league-setup');
    }
  }, [activeTab]);

  // Theme toggle handler with console logging
  const toggleTheme = () => {
    const newMode = !darkMode;
    console.log('Theme toggle clicked! Current:', darkMode, 'New:', newMode);
    console.log('Button clicked at:', new Date().toISOString());
    setDarkMode(newMode);
    localStorage.setItem('draft-dark-mode', JSON.stringify(newMode));
    
    // Force a re-render to ensure the change is applied
    setTimeout(() => {
      console.log('Theme state after toggle:', newMode);
      console.log('Dark class should be:', newMode ? 'dark' : '');
    }, 100);
  };

  // Save filters to localStorage
  const saveFilters = (newSeason: number, newPosition: string, newSearch: string, newSortColumn?: string, newSortDirection?: string) => {
    localStorage.setItem('draft-season', newSeason.toString());
    localStorage.setItem('draft-position', newPosition);
    localStorage.setItem('draft-search', newSearch);
    if (newSortColumn) localStorage.setItem('draft-sort-column', newSortColumn);
    if (newSortDirection) localStorage.setItem('draft-sort-direction', newSortDirection);
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

  // Fetch draft rankings data
  useEffect(() => {
    if (activeTab === 'draft') {
      const leagueSettings = getLeagueSettings();
      const scoring = leagueSettings ? formatScoringForAPI(leagueSettings.scoringSettings) : undefined;
      const includeInjuries = leagueSettings?.includeInjuries ?? true;
      
      getDraftRankings(season, position, limit, offset, scoring, undefined, includeInjuries)
        .then((data) => {
          setDraftPlayers(data.results);
        })
        .catch((err) => console.error('Failed to fetch draft data:', err));
    }
  }, [activeTab, season, position, limit, offset]);

  // Fetch recommendations data
  useEffect(() => {
    if (activeTab === 'recommendations') {
      const leagueSettings = getLeagueSettings();
      const scoring = leagueSettings ? formatScoringForAPI(leagueSettings.scoringSettings) : undefined;
      const roster = getRoster().join(',');
      const includeInjuries = leagueSettings?.includeInjuries ?? true;
      
      getRecommendations(week, position, limit, scoring, roster, includeInjuries)
        .then((data) => {
          setRecommendations(data.results);
        })
        .catch((err) => console.error('Failed to fetch recommendations:', err));
    }
  }, [activeTab, week, position, limit]);

  // Fetch waivers data
  useEffect(() => {
    if (activeTab === 'waivers') {
      const leagueSettings = getLeagueSettings();
      const scoring = leagueSettings ? formatScoringForAPI(leagueSettings.scoringSettings) : undefined;
      const roster = getRoster().join(',');
      const includeInjuries = leagueSettings?.includeInjuries ?? true;
      
      getWaivers(week, position, limit, scoring, roster, includeInjuries)
        .then((data) => {
          setWaivers(data.results);
        })
        .catch((err) => console.error('Failed to fetch waivers:', err));
    }
  }, [activeTab, week, position, limit]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isModalOpen) {
        handleCloseModal();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isModalOpen]);

  // Handle filter changes
  const handleSeasonChange = (newSeason: number) => {
    setSeason(newSeason);
    saveFilters(newSeason, position, searchTerm);
  };

  const handlePositionChange = (newPosition: string) => {
    setPosition(newPosition);
    saveFilters(season, newPosition, searchTerm);
  };

  const handleSearchChange = (newSearch: string) => {
    setSearchTerm(newSearch);
    saveFilters(season, position, newSearch);
  };

  const handleSort = (column: string, direction: 'asc' | 'desc') => {
    setSortColumn(column);
    setSortDirection(direction);
    saveFilters(season, position, searchTerm, column, direction);
  };

  const handlePlayerClick = (player: Player) => {
    setSelectedPlayer(player);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlayer(null);
  };

  const handleToggleWatchlist = (playerName: string) => {
    const newWatchlist = new Set(watchlist);
    if (newWatchlist.has(playerName)) {
      newWatchlist.delete(playerName);
    } else {
      newWatchlist.add(playerName);
    }
    setWatchlist(newWatchlist);
    localStorage.setItem('draft-watchlist', JSON.stringify([...newWatchlist]));
  };

  const handleExportCSV = () => {
    const csvContent = [
      ['Name', 'Position', 'Team', 'Total Points', 'Games Played', 'Avg Points'],
      ...filteredPlayers.map(player => [
        player.name,
        player.position,
        player.team,
        player.total_points.toFixed(2),
        player.games_played.toString(),
        player.avg_points.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `draft-rankings-${season}-${position || 'all'}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

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

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('rankings')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'rankings'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Rankings
              </button>
              <button
                onClick={() => setActiveTab('draft')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'draft'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Draft Prep
              </button>
              <button
                onClick={() => setActiveTab('recommendations')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'recommendations'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Start/Sit
              </button>
              <button
                onClick={() => setActiveTab('waivers')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'waivers'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                Waivers
              </button>
              <button
                onClick={() => setActiveTab('league-setup')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'league-setup'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                League Setup
              </button>
            </nav>
          </div>
        </div>

        {/* Modern Toolbar */}
        <div className="rounded-xl shadow-lg p-6 mb-6 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          {/* Search Bar - Prominent placement */}
          <div className="mb-6">
            <label htmlFor="search" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
              Search Players
            </label>
            <input
              id="search"
              type="text"
              placeholder="Search player name..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="border rounded-lg px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-base"
            />
          </div>

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
                  onChange={(e) => handleSeasonChange(Number(e.target.value))}
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
                  onChange={(e) => handlePositionChange(e.target.value)}
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
              
              {(activeTab === 'recommendations' || activeTab === 'waivers') && (
                <div>
                  <label htmlFor="week" className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">
                    Week
                  </label>
                  <select 
                    id="week"
                    value={week} 
                    onChange={(e) => setWeek(Number(e.target.value))}
                    className="border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
                      <option key={w} value={w}>Week {w}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {startIndex}-{endIndex} of {totalPlayers} players
              </div>
            </div>

            {/* Draft Tools */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  showWatchlistOnly 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600'
                }`}
              >
                {showWatchlistOnly ? 'Show All' : `Watchlist (${watchlist.size})`}
              </button>
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
              >
                Export CSV
              </button>
            </div>
          </div>

          {/* Pagination controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => handlePageChange(offset - limit)}
                disabled={!hasPrevPage || loading}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
              >
                ← Previous
              </button>
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
                Page {currentPage} of {totalPages}
              </span>
              <button 
                onClick={() => handlePageChange(offset + limit)}
                disabled={!hasNextPage || loading}
                className="px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700 shadow-sm"
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

        {!loading && !error && filteredPlayers.length === 0 && activeTab === 'rankings' && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? `No players found matching "${searchTerm}".` : "No players found for the selected criteria."}
            </p>
          </div>
        )}

        {/* Rankings Tab */}
        {activeTab === 'rankings' && !loading && !error && filteredPlayers.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            <PlayerTable 
              players={filteredPlayers} 
              selectedPosition={position}
              onSort={handleSort}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onPlayerClick={handlePlayerClick}
              watchlist={watchlist}
              onToggleWatchlist={handleToggleWatchlist}
              showWatchlistOnly={showWatchlistOnly}
            />
          </div>
        )}

        {/* Draft Rankings Tab */}
        {activeTab === 'draft' && !loading && draftPlayers.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            <DraftRankingsTable 
              players={draftPlayers} 
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onPlayerClick={(player) => {
                // Convert DraftPlayer to Player for modal
                const playerForModal: Player = {
                  name: player.name,
                  position: player.position,
                  team: player.team,
                  total_points: player.total_points,
                  games_played: Math.round(player.total_points / player.avg_points),
                  avg_points: player.avg_points
                };
                setSelectedPlayer(playerForModal);
                setIsModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && !loading && recommendations.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            <RecommendationsTable 
              players={recommendations} 
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onPlayerClick={(player) => {
                // Convert RecommendationPlayer to Player for modal
                const playerForModal: Player = {
                  name: player.name,
                  position: player.position,
                  team: player.team,
                  total_points: player.weighted_avg * 18, // Estimate total
                  games_played: 18,
                  avg_points: player.weighted_avg
                };
                setSelectedPlayer(playerForModal);
                setIsModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Waivers Tab */}
        {activeTab === 'waivers' && !loading && waivers.length > 0 && (
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
            <WaiversTable 
              players={waivers} 
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onSort={handleSort}
              onPlayerClick={(player) => {
                // Convert WaiverPlayer to Player for modal
                const playerForModal: Player = {
                  name: player.name,
                  position: player.position,
                  team: player.team,
                  total_points: player.avg_points * 18, // Estimate total
                  games_played: 18,
                  avg_points: player.avg_points
                };
                setSelectedPlayer(playerForModal);
                setIsModalOpen(true);
              }}
            />
          </div>
        )}

        {/* Empty states for other tabs */}
        {activeTab === 'draft' && !loading && draftPlayers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No draft rankings found for the selected criteria.
            </p>
          </div>
        )}

        {activeTab === 'recommendations' && !loading && recommendations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No recommendations found for Week {week}.
            </p>
          </div>
        )}

        {activeTab === 'waivers' && !loading && waivers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-600 dark:text-gray-400">
              No waiver recommendations found for Week {week}.
            </p>
          </div>
        )}

        {/* League Setup Tab */}
        {activeTab === 'league-setup' && (
          <LeagueSetup onComplete={() => setActiveTab('rankings')} />
        )}
      </div>

      {selectedPlayer && (
        <PlayerModal
          player={selectedPlayer}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
} 