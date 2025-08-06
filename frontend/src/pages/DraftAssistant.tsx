import { useState, useEffect } from 'react';
import { getRankings, getDraftRankings, getRecommendations, getWaivers } from '../lib/api';
import type { Player, DraftPlayer, RecommendationPlayer, WaiverPlayer } from '../lib/api';
import PlayerTable from '../components/PlayerTable';
import PlayerModal from '../components/PlayerModal';
import DraftRankingsTable from '../components/DraftRankingsTable';
import RecommendationsTable from '../components/RecommendationsTable';
import WaiversTable from '../components/WaiversTable';
import LeagueSetup from './LeagueSetup';
import Simulator from './Simulator';
import Alerts from './Alerts';
import SeasonPlanner from './SeasonPlanner';
import TradeAnalyzer from './TradeAnalyzer';
import { hasLeagueSettings } from '../lib/localStorage';

// Professional Fantasy Draft Assistant with Modern UI/UX Overhaul
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
  const [activeTab, setActiveTab] = useState<'rankings' | 'draft' | 'recommendations' | 'waivers' | 'alerts' | 'season-planner' | 'trade-analyzer' | 'simulator' | 'league-setup'>('rankings');

  const [week, setWeek] = useState(18);

  // Apply dark mode to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Check if league settings exist and redirect if needed
  useEffect(() => {
    if (!hasLeagueSettings() && (activeTab === 'draft' || activeTab === 'recommendations' || activeTab === 'waivers' || activeTab === 'alerts' || activeTab === 'season-planner' || activeTab === 'trade-analyzer' || activeTab === 'simulator')) {
      setActiveTab('league-setup');
    }
  }, [activeTab]);

  // Theme toggle handler
  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('draft-dark-mode', JSON.stringify(newMode));
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
    
    // Use a larger limit when searching to ensure we have more data to search through
    const searchLimit = searchTerm.trim() ? 500 : limit;
    
    getRankings(season, position, searchLimit, 0)
      .then((data) => {
        setPlayers(data.results);
        setTotalPlayers(data.total_count);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [season, position, searchTerm]);

  // Always load rankings data for League Setup search functionality
  useEffect(() => {
    if (activeTab === 'league-setup' && players.length === 0) {
      setLoading(true);
      getRankings(season, position, 500, 0)
        .then((data) => {
          setPlayers(data.results);
          setTotalPlayers(data.total_count);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [activeTab, season, position, players.length]);

  // Load draft rankings when tab is active
  useEffect(() => {
    if (activeTab === 'draft') {
      setLoading(true);
      const searchLimit = searchTerm.trim() ? 500 : limit;
      getDraftRankings(season, position, searchLimit, 0)
        .then((data) => {
          setDraftPlayers(data.results);
          setTotalPlayers(data.total_count);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [activeTab, season, position, searchTerm]);

  // Load recommendations when tab is active
  useEffect(() => {
    if (activeTab === 'recommendations') {
      setLoading(true);
      const searchLimit = searchTerm.trim() ? 500 : limit;
      getRecommendations(week, position, searchLimit)
        .then((data) => {
          setRecommendations(data.results);
          setTotalPlayers(data.total_count);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [activeTab, week, position, searchTerm]);

  // Load waivers when tab is active
  useEffect(() => {
    if (activeTab === 'waivers') {
      setLoading(true);
      const searchLimit = searchTerm.trim() ? 500 : limit;
      getWaivers(week, position, searchLimit)
        .then((data) => {
          setWaivers(data.results);
          setTotalPlayers(data.total_count);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [activeTab, week, position, searchTerm]);

  // Keyboard event listener for modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

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
    const headers = ['Rank', 'Name', 'Position', 'Team', 'Total Points', 'Games Played', 'Avg Points'];
    const csvContent = [
      headers.join(','),
      ...filteredPlayers.map((player, index) => [
        index + 1,
        player.name,
        player.position,
        player.team,
        // Handle different player types for CSV export
        'total_points' in player ? player.total_points : 
        'avg_points' in player ? player.avg_points * 18 : 0,
        'games_played' in player ? player.games_played : 18,
        'avg_points' in player ? player.avg_points : 0
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fantasy-players-${season}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handlePageChange = async (newOffset: number) => {
    setOffset(newOffset);
    setLoading(true);
    
    try {
      const data = await getRankings(season, position, limit, newOffset);
      setPlayers(data.results);
      setTotalPlayers(data.total_count);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Helper function to create search-friendly player names
  const createSearchableName = (playerName: string): string[] => {
    const searchVariants = [playerName.toLowerCase()];
    
    // Common name mappings for better search
    const nameMappings: Record<string, string[]> = {
      'T.Kelce': ['travis kelce', 'kelce'],
      'P.Mahomes': ['patrick mahomes', 'mahomes'],
      'J.Allen': ['josh allen', 'allen'],
      'L.Jackson': ['lamar jackson', 'jackson'],
      'J.Hurts': ['jalen hurts', 'hurts'],
      'J.Burrow': ['joe burrow', 'burrow'],
      'J.Goff': ['jared goff', 'goff'],
      'K.Murray': ['kyler murray', 'murray'],
      'S.Barkley': ['saquon barkley', 'barkley'],
      'J.Gibbs': ['jahmyr gibbs', 'gibbs'],
      'D.Henry': ['derrick henry', 'henry'],
      'B.Robinson': ['bijan robinson', 'robinson'],
      'J.Chase': ['ja\'marr chase', 'chase'],
      'A.St. Brown': ['amon-ra st. brown', 'st. brown', 'brown'],
      'J.Jefferson': ['justin jefferson', 'jefferson'],
      'T.McLaurin': ['terry mclaurin', 'mclaurin'],
      'J.Cook': ['james cook', 'cook'],
      'B.Mayfield': ['baker mayfield', 'mayfield'],
      'J.Daniels': ['jayden daniels', 'daniels'],
      'S.Darnold': ['sam darnold', 'darnold'],
      'B.Nix': ['bo nix', 'nix'],
    };

    // Add mapped variants if they exist
    if (nameMappings[playerName]) {
      searchVariants.push(...nameMappings[playerName]);
    }

    // Also add partial matches (last name only)
    const parts = playerName.split('.');
    if (parts.length > 1) {
      searchVariants.push(parts[1].toLowerCase());
    }

    return searchVariants;
  };

  // Enhanced search function
  const playerMatchesSearch = (player: any, searchTerm: string): boolean => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const searchableNames = createSearchableName(player.name);
    
    // Debug logging for search
    if (searchTerm.toLowerCase() === 'kelce') {
      console.log('Searching for kelce:', {
        playerName: player.name,
        searchableNames,
        searchLower,
        matches: searchableNames.some(name => name.includes(searchLower))
      });
    }
    
    return searchableNames.some(name => name.includes(searchLower));
  };

  // Get the appropriate data array based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'draft':
        return draftPlayers;
      case 'recommendations':
        return recommendations;
      case 'waivers':
        return waivers;
      default:
        return players;
    }
  };

  // Get all available data for cross-tab search
  const getAllData = () => {
    return [...players, ...draftPlayers, ...recommendations, ...waivers];
  };

  // Filter players based on search term and watchlist
  const filteredPlayers = (searchTerm.trim() ? getAllData() : getCurrentData()).filter(player => {
    const matchesSearch = playerMatchesSearch(player, searchTerm);
    const matchesWatchlist = !showWatchlistOnly || watchlist.has(player.name);
    return matchesSearch && matchesWatchlist;
  });

  // When searching, use filtered results for pagination
  const isSearching = searchTerm.trim().length > 0;
  const startIndex = isSearching ? 1 : offset + 1;
  const endIndex = isSearching ? filteredPlayers.length : offset + filteredPlayers.length;
  const hasNextPage = isSearching ? false : filteredPlayers.length === limit;
  const hasPrevPage = isSearching ? false : offset > 0;
  const totalPages = isSearching ? 1 : Math.ceil(totalPlayers / limit);
  const currentPage = isSearching ? 1 : Math.floor(offset / limit) + 1;

  // Debug logging for search results
  if (searchTerm.toLowerCase() === 'kelce') {
    console.log('Search debug:', {
      searchTerm,
      activeTab,
      currentTabData: getCurrentData().length,
      allData: getAllData().length,
      filteredCount: filteredPlayers.length,
      currentTabPlayerNames: getCurrentData().map(p => p.name).slice(0, 5),
      allPlayerNames: getAllData().map(p => p.name).slice(0, 10),
      filteredPlayerNames: filteredPlayers.map(p => p.name),
      isSearching,
      startIndex,
      endIndex
    });
  }

  // Tab configuration
  const tabs = [
    { id: 'rankings', label: 'Rankings' },
    { id: 'draft', label: 'Draft Prep' },
    { id: 'recommendations', label: 'Start/Sit' },
    { id: 'waivers', label: 'Waivers' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'season-planner', label: 'Season Planner' },
    { id: 'trade-analyzer', label: 'Trade Analyzer' },
    { id: 'simulator', label: 'Simulator' },
    { id: 'league-setup', label: 'League Setup' }
  ];

  // Helper function to convert different player types to Player for modal
  const convertToPlayerForModal = (player: any): Player => {
    if ('total_points' in player && 'games_played' in player && 'avg_points' in player) {
      return player as Player;
    }
    
    // For draft players, recommendations, and waivers, create a Player object
    return {
      name: player.name,
      position: player.position,
      team: player.team,
      total_points: player.total_points || player.avg_points * 18 || 0,
      games_played: player.games_played || 18,
      avg_points: player.avg_points || 0
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Enhanced Header with Gradient Background */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-2xl shadow-2xl"></div>
          <div className="relative flex justify-between items-center p-8">
            <div>
              <h1 className="text-5xl font-bold text-white mb-2 drop-shadow-lg">
                Draft Assistant
              </h1>
              <p className="text-purple-100 text-lg font-medium">
                Professional Fantasy Football Analytics
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="p-3 rounded-xl bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30 transition-all duration-200 shadow-lg hover:shadow-xl"
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Enhanced Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 p-2 shadow-xl">
            <div className="flex flex-wrap gap-2 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-3 rounded-xl font-semibold text-sm transition-all duration-300 whitespace-nowrap ${
                    activeTab === tab.id
                      ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced Search & Filters Section */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl p-8 mb-8">
          {/* Enhanced Search Field */}
          <div className="mb-8">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search player name..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full sm:w-80 pl-12 pr-4 py-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 text-base focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 shadow-lg"
              />
              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                💡 Try searching for full names like "Travis Kelce" or "Patrick Mahomes"
              </p>
            </div>
          </div>

          {/* Enhanced Filters Row */}
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div className="flex flex-wrap gap-6">
              <div className="space-y-2">
                <label htmlFor="season" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Season
                </label>
                <select 
                  id="season"
                  value={season} 
                  onChange={(e) => handleSeasonChange(Number(e.target.value))}
                  className="rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-white focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 shadow-lg"
                >
                  <option value={2023}>2023</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
              
              <div className="space-y-2">
                <label htmlFor="position" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                  Position
                </label>
                <select 
                  id="position"
                  value={position} 
                  onChange={(e) => handlePositionChange(e.target.value)}
                  className="rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-white focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 shadow-lg"
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
                <div className="space-y-2">
                  <label htmlFor="week" className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                    Week
                  </label>
                  <select 
                    id="week"
                    value={week} 
                    onChange={(e) => setWeek(Number(e.target.value))}
                    className="rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-base text-gray-900 dark:text-white focus:ring-4 focus:ring-purple-500/20 focus:border-purple-500 transition-all duration-200 shadow-lg"
                  >
                    {Array.from({ length: 18 }, (_, i) => i + 1).map(w => (
                      <option key={w} value={w}>Week {w}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Enhanced Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowWatchlistOnly(!showWatchlistOnly)}
                className={`px-6 py-3 rounded-xl font-bold transition-all duration-200 text-sm shadow-lg hover:shadow-xl ${
                  showWatchlistOnly 
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white transform scale-105' 
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {showWatchlistOnly ? 'Show All' : `Watchlist (${watchlist.size})`}
              </button>
              
              <button
                onClick={handleExportCSV}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        {/* Enhanced Content Area */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-200/50 dark:border-gray-700/50 shadow-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <div className="text-red-600 dark:text-red-400 text-lg font-semibold">{error}</div>
            </div>
          ) : (
            <>
              {/* Enhanced Results Header */}
              <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {activeTab === 'rankings' && 'Player Rankings'}
                    {activeTab === 'draft' && 'Draft Rankings'}
                    {activeTab === 'recommendations' && 'Start/Sit Recommendations'}
                    {activeTab === 'waivers' && 'Waiver Wire'}
                    {activeTab === 'alerts' && 'Alerts'}
                    {activeTab === 'season-planner' && 'Season Planner'}
                    {activeTab === 'trade-analyzer' && 'Trade Analyzer'}
                    {activeTab === 'simulator' && 'Simulator'}
                    {activeTab === 'league-setup' && 'League Setup'}
                  </h2>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Showing {startIndex}-{endIndex} of {isSearching ? filteredPlayers.length : totalPlayers} players
                  </div>
                </div>
              </div>

              {/* Enhanced Table Container */}
              <div className="p-8">
                {activeTab === 'rankings' && (
                  <PlayerTable
                    players={filteredPlayers.filter((player): player is Player => 
                      'total_points' in player && 'games_played' in player && 'avg_points' in player
                    )}
                    selectedPosition={position}
                    onSort={handleSort}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onPlayerClick={handlePlayerClick}
                    watchlist={watchlist}
                    onToggleWatchlist={handleToggleWatchlist}
                    showWatchlistOnly={showWatchlistOnly}
                  />
                )}
                
                {activeTab === 'draft' && (
                  <DraftRankingsTable
                    players={filteredPlayers.filter((player): player is DraftPlayer => 'consistency_score' in player)}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    onPlayerClick={(player) => handlePlayerClick(convertToPlayerForModal(player))}
                  />
                )}
                
                {activeTab === 'recommendations' && (
                  <RecommendationsTable
                    players={filteredPlayers.filter((player): player is RecommendationPlayer => 'season_avg' in player)}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    onPlayerClick={(player) => handlePlayerClick(convertToPlayerForModal(player))}
                  />
                )}
                
                {activeTab === 'waivers' && (
                  <WaiversTable
                    players={filteredPlayers.filter((player): player is WaiverPlayer => 'ros_projection' in player)}
                    sortColumn={sortColumn}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                    onPlayerClick={(player) => handlePlayerClick(convertToPlayerForModal(player))}
                  />
                )}
                
                {activeTab === 'alerts' && <Alerts />}
                {activeTab === 'season-planner' && <SeasonPlanner />}
                {activeTab === 'trade-analyzer' && <TradeAnalyzer />}
                {activeTab === 'simulator' && <Simulator />}
                {activeTab === 'league-setup' && <LeagueSetup onComplete={() => setActiveTab('rankings')} availablePlayers={players} />}
              </div>

              {/* Enhanced Pagination */}
              {activeTab === 'rankings' && !isSearching && (
                <div className="px-8 py-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-t border-gray-200 dark:border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(offset - limit)}
                        disabled={!hasPrevPage}
                        className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => handlePageChange(offset + limit)}
                        disabled={!hasNextPage}
                        className="px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Enhanced Modal */}
      <PlayerModal
        player={selectedPlayer}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
} 