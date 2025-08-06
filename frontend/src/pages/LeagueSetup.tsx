import { useState, useEffect } from 'react';
import { 
  DEFAULT_SCORING_SETTINGS, 
  DEFAULT_ROSTER_SLOTS,
  getLeagueSettings,
  saveLeagueSettings,
  getRoster,
  saveRoster
} from '../lib/localStorage';
import type { LeagueSettings } from '../lib/localStorage';
import { getRankings } from '../lib/api';
import type { Player } from '../lib/api';

interface LeagueSetupProps {
  onComplete: () => void;
}

export default function LeagueSetup({ onComplete }: LeagueSetupProps) {
  const [settings, setSettings] = useState<LeagueSettings>({
    leagueName: '',
    rosterSlots: { ...DEFAULT_ROSTER_SLOTS },
    scoringSettings: { ...DEFAULT_SCORING_SETTINGS },
    roster: [],
    starters: [], // NEW: Default to empty array
    includeInjuries: true,
    playoff_weeks: [15, 16, 17],
    playoff_alerts_start_week: 10
  });
  
  const [roster, setRoster] = useState<string[]>([]);
  const [rosterSearch, setRosterSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Load existing settings if available
    const existingSettings = getLeagueSettings();
    if (existingSettings) {
      setSettings(existingSettings);
    }
    
    // Load existing roster
    const existingRoster = getRoster();
    setRoster(existingRoster);
  }, []);

  const handleSave = () => {
    const completeSettings = {
      ...settings,
      roster
    };
    saveLeagueSettings(completeSettings);
    saveRoster(roster);
    setSaved(true);
    
    setTimeout(() => {
      onComplete();
    }, 1500);
  };

  // Helper function to create search-friendly player names (same as DraftAssistant)
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

  // Enhanced search function (same as DraftAssistant)
  const playerMatchesSearch = (player: Player, searchTerm: string): boolean => {
    if (!searchTerm.trim()) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const searchableNames = createSearchableName(player.name);
    
    return searchableNames.some(name => name.includes(searchLower));
  };

  const handleRosterSearch = async (query: string) => {
    setRosterSearch(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Load more data when searching (same as DraftAssistant)
      const searchLimit = query.trim() ? 500 : 50;
      const response = await getRankings(2024, undefined, searchLimit, 0);
      const filtered = response.results.filter(player => playerMatchesSearch(player, query));
      setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
    } catch (error) {
      console.error('Error searching players:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addToRoster = (player: Player) => {
    if (!roster.includes(player.name)) {
      setRoster([...roster, player.name]);
    }
    setRosterSearch('');
    setSearchResults([]);
  };

  const removeFromRoster = (playerName: string) => {
    setRoster(roster.filter(name => name !== playerName));
  };

  const updateRosterSlot = (position: keyof LeagueSettings['rosterSlots'], value: number) => {
    setSettings(prev => ({
      ...prev,
      rosterSlots: {
        ...prev.rosterSlots,
        [position]: Math.max(0, Math.min(value, position === 'FLEX' || position === 'Bench' ? 10 : 5))
      }
    }));
  };

  const updateScoringSetting = (key: keyof LeagueSettings['scoringSettings'], value: number) => {
    setSettings(prev => ({
      ...prev,
      scoringSettings: {
        ...prev.scoringSettings,
        [key]: Math.max(-10, Math.min(10, value))
      }
    }));
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-2">League Setup</h1>
          <p className="text-gray-400">Configure your league settings to personalize your fantasy football experience</p>
        </div>

        {saved && (
          <div className="mb-6 p-4 bg-green-600/20 border border-green-500/50 rounded-lg">
            <p className="text-green-400 font-medium">✅ League settings saved successfully!</p>
          </div>
        )}

        <div className="space-y-8">
          {/* League Info */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">League Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  League Name
                </label>
                <input
                  type="text"
                  value={settings.leagueName}
                  onChange={(e) => setSettings(prev => ({ ...prev, leagueName: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  placeholder="My Fantasy League"
                />
              </div>
            </div>
          </div>

          {/* Roster Slots */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">Roster Slots</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(settings.rosterSlots).map(([position, count]) => (
                <div key={position}>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    {position}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={position === 'FLEX' || position === 'Bench' ? 10 : 5}
                    value={count}
                    onChange={(e) => updateRosterSlot(position as keyof LeagueSettings['rosterSlots'], parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Scoring Settings */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">Scoring Settings</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(settings.scoringSettings).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-semibold mb-2 text-gray-300">
                    {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="-10"
                    max="10"
                    value={value}
                    onChange={(e) => updateScoringSetting(key as keyof LeagueSettings['scoringSettings'], parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Roster Management */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">My Roster</h2>
            
            {/* Search */}
            <div className="mb-4">
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Add Players
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={rosterSearch}
                  onChange={(e) => handleRosterSearch(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  placeholder="Search for players..."
                />
                {isSearching && (
                  <div className="absolute right-3 top-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 bg-gray-800 border border-gray-700 rounded-lg max-h-60 overflow-y-auto">
                  {searchResults.map((player) => (
                    <button
                      key={player.name}
                      onClick={() => addToRoster(player)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="text-sm text-gray-400">{player.position} • {player.team}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Current Roster */}
            <div>
              <label className="block text-sm font-semibold mb-2 text-gray-300">
                Current Roster ({roster.length} players)
              </label>
              {roster.length === 0 ? (
                <p className="text-gray-500 italic">No players added yet</p>
              ) : (
                <div className="space-y-2">
                  {roster.map((playerName) => (
                    <div key={playerName} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <span className="text-white">{playerName}</span>
                      <button
                        onClick={() => removeFromRoster(playerName)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Enhanced Predictive Modeling */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">Enhanced Predictive Modeling</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="includeInjuries"
                  checked={settings.includeInjuries}
                  onChange={(e) => setSettings(prev => ({ ...prev, includeInjuries: e.target.checked }))}
                  className="w-5 h-5 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500 focus:ring-2"
                />
                <label htmlFor="includeInjuries" className="text-white font-medium">
                  Include injury adjustments in projections
                </label>
              </div>
              <p className="text-gray-400 text-sm">
                When enabled, player projections will be adjusted based on injury status, strength of schedule, and performance trends.
              </p>
            </div>
          </div>

          {/* Playoff Settings */}
          <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">Playoff Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Playoff Weeks
                </label>
                <input
                  type="text"
                  value={settings.playoff_weeks.join(', ')}
                  onChange={(e) => {
                    const weeks = e.target.value.split(',').map(w => parseInt(w.trim())).filter(w => !isNaN(w));
                    setSettings(prev => ({ ...prev, playoff_weeks: weeks }));
                  }}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  placeholder="15, 16, 17"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Enter playoff weeks separated by commas (e.g., 15, 16, 17)
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-300">
                  Playoff Alerts Start Week
                </label>
                <input
                  type="number"
                  value={settings.playoff_alerts_start_week}
                  onChange={(e) => setSettings(prev => ({ 
                    ...prev, 
                    playoff_alerts_start_week: parseInt(e.target.value) || 10 
                  }))}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  min="1"
                  max="18"
                />
                <p className="text-gray-400 text-sm mt-1">
                  Week when playoff alerts start appearing (default: 10)
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-center">
            <button
              onClick={handleSave}
              disabled={saved}
              className="px-8 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {saved ? 'Settings Saved!' : 'Save League Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 