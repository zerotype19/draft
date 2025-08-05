import { useState, useEffect } from 'react';
import { analyzeTrade } from '../lib/api';
import type { TradeAnalysis } from '../lib/api';
import { getLeagueSettings, getRoster, formatScoringForAPI } from '../lib/localStorage';

interface TradeProposal {
  give: string[];
  receive: string[];
}

export default function TradeAnalyzer() {
  const [tradeProposal, setTradeProposal] = useState<TradeProposal>({
    give: [],
    receive: []
  });
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availablePlayers, setAvailablePlayers] = useState<string[]>([]);

  useEffect(() => {
    loadAvailablePlayers();
  }, []);

  const loadAvailablePlayers = () => {
    // In a real implementation, this would fetch all available players
    // For now, we'll use mock data
    setAvailablePlayers([
      'Josh Allen', 'Patrick Mahomes', 'Christian McCaffrey', 'Saquon Barkley',
      'Tyreek Hill', 'Davante Adams', 'Travis Kelce', 'Mark Andrews'
    ]);
  };

  const handleAnalyzeTrade = async () => {
    if (tradeProposal.give.length === 0 && tradeProposal.receive.length === 0) {
      setError('Please add players to trade');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const settings = getLeagueSettings();
      const roster = getRoster();

      if (!settings || roster.length === 0) {
        setError('Please configure your league settings and roster first.');
        return;
      }

      const result = await analyzeTrade(
        roster,
        tradeProposal.give,
        tradeProposal.receive,
        settings.playoff_weeks,
        formatScoringForAPI(settings.scoringSettings),
        settings.includeInjuries
      );

      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze trade');
    } finally {
      setLoading(false);
    }
  };

  const addPlayerToTrade = (player: string, side: 'give' | 'receive') => {
    setTradeProposal(prev => ({
      ...prev,
      [side]: [...prev[side], player]
    }));
  };

  const removePlayerFromTrade = (player: string, side: 'give' | 'receive') => {
    setTradeProposal(prev => ({
      ...prev,
      [side]: prev[side].filter(p => p !== player)
    }));
  };

  const getImpactColor = (change: number) => {
    if (change > 0) return 'text-green-600 dark:text-green-400';
    if (change < 0) return 'text-red-600 dark:text-red-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const getImpactIcon = (change: number) => {
    if (change > 0) return '↗️';
    if (change < 0) return '↘️';
    return '→';
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Trade Analyzer
        </h2>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Give Side */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Give
            </h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[200px]">
              {tradeProposal.give.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No players selected
                </p>
              ) : (
                <div className="space-y-2">
                  {tradeProposal.give.map((player, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                      <span className="text-gray-900 dark:text-white">{player}</span>
                      <button
                        onClick={() => removePlayerFromTrade(player, 'give')}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Receive Side */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Receive
            </h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 min-h-[200px]">
              {tradeProposal.receive.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                  No players selected
                </p>
              ) : (
                <div className="space-y-2">
                  {tradeProposal.receive.map((player, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                      <span className="text-gray-900 dark:text-white">{player}</span>
                      <button
                        onClick={() => removePlayerFromTrade(player, 'receive')}
                        className="text-red-500 hover:text-red-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Available Players */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Available Players
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {availablePlayers.map((player) => (
              <div key={player} className="flex space-x-2">
                <button
                  onClick={() => addPlayerToTrade(player, 'give')}
                  className="flex-1 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 text-red-700 dark:text-red-300 text-sm py-1 px-2 rounded"
                >
                  Give
                </button>
                <button
                  onClick={() => addPlayerToTrade(player, 'receive')}
                  className="flex-1 bg-green-100 hover:bg-green-200 dark:bg-green-900/20 dark:hover:bg-green-900/40 text-green-700 dark:text-green-300 text-sm py-1 px-2 rounded"
                >
                  Receive
                </button>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleAnalyzeTrade}
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          {loading ? 'Analyzing...' : 'Analyze Trade'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}
      </div>

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Trade Analysis Summary
            </h3>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analysis.current_ros_total.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Current ROS</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {analysis.proposed_ros_total.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Proposed ROS</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getImpactColor(analysis.net_change)}`}>
                  {getImpactIcon(analysis.net_change)} {analysis.net_change.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Net Change</div>
              </div>
            </div>
          </div>

          {/* Impact Weeks */}
          {analysis.impact_weeks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Significant Impact Weeks
              </h3>
              <div className="space-y-2">
                {analysis.impact_weeks.map((week, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="font-medium text-gray-900 dark:text-white">
                        Week {week.week}
                      </span>
                      {week.is_playoff_week && (
                        <span className="bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 text-xs px-2 py-1 rounded">
                          Playoff
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${getImpactColor(week.change)}`}>
                        {getImpactIcon(week.change)} {week.change.toFixed(1)} pts
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        {week.reason}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Playoff Impact */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Playoff Impact
            </h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {analysis.playoff_impact.current_playoff_total.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Current Playoff Total</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900 dark:text-white">
                  {analysis.playoff_impact.proposed_playoff_total.toFixed(1)}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Proposed Playoff Total</div>
              </div>
            </div>
            <div className="mt-4 text-center">
              <div className={`text-lg font-bold ${getImpactColor(analysis.playoff_impact.playoff_change)}`}>
                {getImpactIcon(analysis.playoff_impact.playoff_change)} {analysis.playoff_impact.playoff_change.toFixed(1)} pts
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Playoff Change</div>
            </div>
          </div>

          {/* Depth Analysis */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Position Impact
            </h3>
            <div className="space-y-2">
              {Object.entries(analysis.depth_analysis.position_impact).map(([position, impact]) => (
                <div key={position} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                  <span className="font-medium text-gray-900 dark:text-white">{position}</span>
                  <span className={`font-bold ${getImpactColor(impact)}`}>
                    {getImpactIcon(impact)} {impact.toFixed(1)} pts
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 