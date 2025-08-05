import { useState, useEffect } from 'react';
import { getRankings, getWaivers, simulateRoster } from '../lib/api';
import type { Player, WaiverPlayer, SimulationMove, PlayerImpact, SimulationResponse } from '../lib/api';
import { getLeagueSettings, getRoster, saveRoster } from '../lib/localStorage';
import type { LeagueSettings } from '../lib/localStorage';

type SimulationMode = 'draft' | 'lineup' | 'waiver';

interface SimulationScenario {
  id: string;
  name: string;
  mode: SimulationMode;
  moves: SimulationMove[];
  result?: SimulationResponse;
}

export default function Simulator() {
  const [mode, setMode] = useState<SimulationMode>('draft');
  const [currentRoster, setCurrentRoster] = useState<string[]>([]);
  const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
  const [playerSearch, setPlayerSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [waiverCandidates, setWaiverCandidates] = useState<WaiverPlayer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [simulationResult, setSimulationResult] = useState<SimulationResponse | null>(null);
  const [scenarios, setScenarios] = useState<SimulationScenario[]>([]);
  const [currentScenario, setCurrentScenario] = useState<SimulationScenario | null>(null);
  const [pendingMoves, setPendingMoves] = useState<SimulationMove[]>([]);
  const [scenarioName, setScenarioName] = useState('');

  useEffect(() => {
    // Load league settings and current roster
    const settings = getLeagueSettings();
    const roster = getRoster();
    setLeagueSettings(settings);
    setCurrentRoster(roster);
  }, []);

  useEffect(() => {
    // Load waiver candidates for waiver mode
    if (mode === 'waiver' && currentRoster.length > 0) {
      loadWaiverCandidates();
    }
  }, [mode, currentRoster]);

  const loadWaiverCandidates = async () => {
    try {
      const response = await getWaivers(18, undefined, 50, undefined, currentRoster.join(','));
      setWaiverCandidates(response.results);
    } catch (error) {
      console.error('Failed to load waiver candidates:', error);
    }
  };

  const handlePlayerSearch = async (query: string) => {
    setPlayerSearch(query);
    
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await getRankings(2024, undefined, 50, 0);
      const filtered = response.results.filter(player =>
        player.name.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10));
    } catch (error) {
      console.error('Error searching players:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const addPlayerToSimulation = (player: Player) => {
    const move: SimulationMove = {
      action: 'add',
      player_id: player.player_id || player.name, // Fallback to name if no player_id
      player_name: player.name,
      target_slot: player.position
    };
    
    setPendingMoves([...pendingMoves, move]);
    setPlayerSearch('');
    setSearchResults([]);
  };

  const removePlayerFromSimulation = (playerId: string) => {
    const move: SimulationMove = {
      action: 'remove',
      player_id: playerId
    };
    
    setPendingMoves([...pendingMoves, move]);
  };

  const swapPlayers = (player1Id: string, player2Id: string) => {
    const move: SimulationMove = {
      action: 'swap',
      player_id: player1Id,
      swap_with_player_id: player2Id
    };
    
    setPendingMoves([...pendingMoves, move]);
  };

  const runSimulation = async () => {
    if (pendingMoves.length === 0) return;

    try {
      const scoring = leagueSettings ? Object.entries(leagueSettings.scoringSettings)
        .map(([key, value]) => `${key}:${value}`)
        .join(',') : undefined;

      const result = await simulateRoster(
        mode,
        currentRoster,
        pendingMoves,
        scoring,
        leagueSettings?.includeInjuries,
        leagueSettings?.rosterSlots
      );

      setSimulationResult(result);
    } catch (error) {
      console.error('Simulation failed:', error);
    }
  };

  const saveScenario = () => {
    if (!scenarioName.trim()) return;

    const scenario: SimulationScenario = {
      id: Date.now().toString(),
      name: scenarioName,
      mode,
      moves: [...pendingMoves],
      result: simulationResult || undefined
    };

    setScenarios([...scenarios, scenario]);
    setScenarioName('');
  };

  const loadScenario = (scenario: SimulationScenario) => {
    setCurrentScenario(scenario);
    setPendingMoves(scenario.moves);
    setSimulationResult(scenario.result || null);
  };

  const applySimulation = () => {
    if (!simulationResult) return;

    // Update roster based on simulation moves
    let newRoster = [...currentRoster];
    
    for (const move of pendingMoves) {
      if (move.action === 'add' && move.player_id) {
        newRoster.push(move.player_id);
      } else if (move.action === 'remove' && move.player_id) {
        newRoster = newRoster.filter(id => id !== move.player_id);
      }
    }

    setCurrentRoster(newRoster);
    saveRoster(newRoster);
    setPendingMoves([]);
    setSimulationResult(null);
  };

  const getPositionColor = (position: string): string => {
    const colors: Record<string, string> = {
      QB: "bg-blue-500/80 text-white",
      RB: "bg-green-500/80 text-white",
      WR: "bg-orange-500/80 text-white",
      TE: "bg-purple-500/80 text-white",
      K: "bg-pink-500/80 text-white",
      DEF: "bg-gray-500/80 text-white"
    };
    return colors[position] || "bg-gray-500/80 text-white";
  };

  const getInjuryStatusColor = (status?: string): string => {
    if (!status) return '';
    const colors: Record<string, string> = {
      'Q': 'bg-yellow-500/80 text-white',
      'O': 'bg-red-500/80 text-white',
      'IR': 'bg-red-500/80 text-white',
      'PUP': 'bg-orange-500/80 text-white',
      'Doubtful': 'bg-orange-500/80 text-white',
      'Probable': 'bg-green-500/80 text-white'
    };
    return colors[status] || '';
  };

  const getSOSColor = (score?: string): string => {
    if (!score) return '';
    const colors: Record<string, string> = {
      'Easy': 'bg-green-500/80 text-white',
      'Medium': 'bg-gray-500/80 text-white',
      'Hard': 'bg-red-500/80 text-white'
    };
    return colors[score] || '';
  };

  const getTrendIcon = (trend?: string): string => {
    if (!trend) return '';
    const icons: Record<string, string> = {
      'Hot': '🔥',
      'Cold': '❄️',
      'Neutral': ''
    };
    return icons[trend] || '';
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto p-6 max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-2">Fantasy Simulator</h1>
          <p className="text-gray-400">Test draft strategies, lineup changes, and waiver moves before making them</p>
        </div>

        {/* Mode Selector */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-900 rounded-lg p-1">
            {(['draft', 'lineup', 'waiver'] as SimulationMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                  mode === m
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            {/* Player Search */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">Add Players</h2>
              
              <div className="relative mb-4">
                <input
                  type="text"
                  value={playerSearch}
                  onChange={(e) => handlePlayerSearch(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                  placeholder="Search for players..."
                />
                {isSearching && (
                  <div className="absolute right-3 top-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
              
              {searchResults.length > 0 && (
                <div className="max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg">
                  {searchResults.map((player) => (
                    <button
                      key={player.name}
                      onClick={() => addPlayerToSimulation(player)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                    >
                      <div className="font-medium text-white">{player.name}</div>
                      <div className="text-sm text-gray-400">{player.position} • {player.team}</div>
                    </button>
                  ))}
                </div>
              )}

              {mode === 'waiver' && waiverCandidates.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Waiver Candidates</h3>
                  <div className="max-h-60 overflow-y-auto bg-gray-800 border border-gray-700 rounded-lg">
                    {waiverCandidates.slice(0, 10).map((player) => (
                      <button
                        key={player.name}
                        onClick={() => addPlayerToSimulation(player)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-700 transition-colors border-b border-gray-700 last:border-b-0"
                      >
                        <div className="font-medium text-white">{player.name}</div>
                        <div className="text-sm text-gray-400">
                          {player.position} • {player.team} • {player.ros_projection.toFixed(1)} pts
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Pending Moves */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">Pending Moves</h2>
              
              {pendingMoves.length === 0 ? (
                <p className="text-gray-500 italic">No moves added yet</p>
              ) : (
                <div className="space-y-2">
                  {pendingMoves.map((move, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div>
                        <div className="font-medium text-white">
                          {move.action === 'add' ? 'Add' : move.action === 'remove' ? 'Remove' : 'Swap'}: {move.player_name}
                        </div>
                        {move.target_slot && (
                          <div className="text-sm text-gray-400">Slot: {move.target_slot}</div>
                        )}
                      </div>
                      <button
                        onClick={() => setPendingMoves(pendingMoves.filter((_, i) => i !== index))}
                        className="text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {pendingMoves.length > 0 && (
                <div className="mt-4 space-y-2">
                  <button
                    onClick={runSimulation}
                    className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Run Simulation
                  </button>
                  
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={scenarioName}
                      onChange={(e) => setScenarioName(e.target.value)}
                      placeholder="Scenario name..."
                      className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                    />
                    <button
                      onClick={saveScenario}
                      disabled={!scenarioName.trim()}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Saved Scenarios */}
            {scenarios.length > 0 && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <h2 className="text-xl font-bold mb-4">Saved Scenarios</h2>
                <div className="space-y-2">
                  {scenarios.map((scenario) => (
                    <button
                      key={scenario.id}
                      onClick={() => loadScenario(scenario)}
                      className="w-full p-3 text-left bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <div className="font-medium text-white">{scenario.name}</div>
                      <div className="text-sm text-gray-400">{scenario.mode} • {scenario.moves.length} moves</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Results */}
          <div className="lg:col-span-2 space-y-6">
            {/* Simulation Results */}
            {simulationResult && (
              <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold">Simulation Results</h2>
                  <button
                    onClick={applySimulation}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Apply Changes
                  </button>
                </div>

                {/* Projection Summary */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400">Baseline Projection</div>
                    <div className="text-2xl font-bold text-white">{simulationResult.baselineProjection.toFixed(1)}</div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-sm text-gray-400">New Projection</div>
                    <div className="text-2xl font-bold text-white">{simulationResult.newProjection.toFixed(1)}</div>
                  </div>
                  <div className={`rounded-lg p-4 ${
                    simulationResult.difference >= 0 ? 'bg-green-600/20 border border-green-500/50' : 'bg-red-600/20 border border-red-500/50'
                  }`}>
                    <div className="text-sm text-gray-400">Difference</div>
                    <div className={`text-2xl font-bold ${
                      simulationResult.difference >= 0 ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {simulationResult.difference >= 0 ? '+' : ''}{simulationResult.difference.toFixed(1)}
                    </div>
                  </div>
                </div>

                {/* Optimal Lineup Comparison */}
                {simulationResult.optimalProjection && (
                  <div className="mb-6 p-4 bg-blue-600/20 border border-blue-500/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-400">Your Simulated Lineup</div>
                        <div className="text-xl font-bold text-white">{simulationResult.newProjection.toFixed(1)} pts</div>
                      </div>
                      <div className="text-center">
                        <div className="text-sm text-gray-400">Optimal Lineup</div>
                        <div className="text-xl font-bold text-blue-400">{simulationResult.optimalProjection.toFixed(1)} pts</div>
                      </div>
                      <div className={`text-center ${
                        (simulationResult.optimalProjection - simulationResult.newProjection) >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        <div className="text-sm text-gray-400">Difference</div>
                        <div className="text-xl font-bold">
                          {(simulationResult.optimalProjection - simulationResult.newProjection) >= 0 ? '+' : ''}
                          {(simulationResult.optimalProjection - simulationResult.newProjection).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slot Warnings */}
                {simulationResult.slotWarnings && simulationResult.slotWarnings.length > 0 && (
                  <div className="mb-6 p-4 bg-yellow-600/20 border border-yellow-500/50 rounded-lg">
                    <div className="text-yellow-400 font-semibold mb-2">⚠️ Slot Warnings</div>
                    <ul className="text-sm text-yellow-300">
                      {simulationResult.slotWarnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Player Impacts */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Player Impacts</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead className="bg-gray-800">
                        <tr>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Player</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Pos</th>
                          <th className="px-4 py-2 text-left text-sm font-semibold text-gray-300">Team</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Projection</th>
                          <th className="px-4 py-2 text-right text-sm font-semibold text-gray-300">Change</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {simulationResult.playerImpacts.map((player) => (
                          <tr key={player.player_id} className="hover:bg-gray-800/50">
                            <td className="px-4 py-2 text-sm text-white">
                              {player.player_name}
                              {player.trend && (
                                <span className="ml-2 text-sm">{getTrendIcon(player.trend)}</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-sm">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                                {player.position}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-300">{player.team}</td>
                            <td className="px-4 py-2 text-sm text-gray-300 text-right">{player.projection.toFixed(1)}</td>
                            <td className={`px-4 py-2 text-sm font-medium text-right ${
                              player.change >= 0 ? 'text-green-400' : 'text-red-400'
                            }`}>
                              {player.change >= 0 ? '+' : ''}{player.change.toFixed(1)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Current Roster */}
            <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
              <h2 className="text-xl font-bold mb-4">Current Roster</h2>
              {currentRoster.length === 0 ? (
                <p className="text-gray-500 italic">No players in roster</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {currentRoster.map((playerId) => (
                    <div key={playerId} className="p-3 bg-gray-800 rounded-lg">
                      <div className="font-medium text-white">{playerId}</div>
                      <div className="text-sm text-gray-400">Player ID: {playerId}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 