import { useState, useEffect } from 'react';
import { getAlerts } from '../lib/api';
import type { Alert } from '../lib/api';
import { getLeagueSettings, getRoster, getStarters, formatScoringForAPI } from '../lib/localStorage';

interface TopMove {
  description: string;
  projected_gain: number;
  suggested_move?: Alert['suggested_move'];
}

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [topMoves, setTopMoves] = useState<TopMove[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      setError(null);

      const leagueSettings = getLeagueSettings();
      const roster = getRoster();
      const starters = getStarters();

      if (!leagueSettings || roster.length === 0) {
        setError('Please configure your league settings and roster first.');
        setLoading(false);
        return;
      }

      const scoring = formatScoringForAPI(leagueSettings.scoringSettings);
      const alertsData = await getAlerts(
        18, // Current week
        roster,
        starters,
        scoring,
        leagueSettings.includeInjuries
      );

      // Filter out dismissed alerts
      const activeAlerts = alertsData.filter(alert => 
        !dismissedAlerts.has(`${alert.type}-${alert.player}`)
      );

      setAlerts(activeAlerts);

      // Generate top 3 moves
      const movesWithGains = activeAlerts
        .filter(alert => alert.projected_gain && alert.projected_gain > 0)
        .sort((a, b) => (b.projected_gain || 0) - (a.projected_gain || 0))
        .slice(0, 3)
        .map(alert => ({
          description: `${alert.player}: ${alert.detail}`,
          projected_gain: alert.projected_gain || 0,
          suggested_move: alert.suggested_move
        }));

      setTopMoves(movesWithGains);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      setError('Failed to load alerts. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const dismissAlert = (alert: Alert) => {
    const alertKey = `${alert.type}-${alert.player}`;
    const newDismissed = new Set(dismissedAlerts);
    newDismissed.add(alertKey);
    setDismissedAlerts(newDismissed);
    
    // Save to localStorage
    const dismissedData = JSON.parse(localStorage.getItem('dismissedAlerts') || '[]');
    dismissedData.push({
      week: 18,
      alert_id: alertKey
    });
    localStorage.setItem('dismissedAlerts', JSON.stringify(dismissedData));
    
    // Remove from alerts list
    setAlerts(prev => prev.filter(a => `${a.type}-${a.player}` !== alertKey));
  };

  const getAlertIcon = (type: Alert['type']): string => {
    const icons: Record<Alert['type'], string> = {
      injury: '🚑',
      bad_matchup: '🚫',
      waiver_opportunity: '🔥',
      cold_streak: '❄️',
      lineup_optimization: '⚡',
      playoff_alert: '🏆'
    };
    return icons[type];
  };

  const getAlertColor = (type: Alert['type']): string => {
    const colors: Record<Alert['type'], string> = {
      injury: 'bg-red-500/80',
      bad_matchup: 'bg-orange-500/80',
      waiver_opportunity: 'bg-green-500/80',
      cold_streak: 'bg-blue-500/80',
      lineup_optimization: 'bg-purple-500/80',
      playoff_alert: 'bg-yellow-500/80'
    };
    return colors[type];
  };

  const handleViewFix = (alert: Alert) => {
    // Navigate to Simulator with pre-loaded move
    // This will be handled by the parent component
    console.log('View fix for alert:', alert);
  };

  const handleApplyMove = (move: TopMove) => {
    // Apply the suggested move directly
    console.log('Apply move:', move);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="container mx-auto p-6 max-w-4xl">
          <div className="text-center py-12">
            <p className="text-red-400">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-white mb-2">Smart Alerts</h1>
          <p className="text-gray-400">Automated insights for your fantasy team</p>
        </div>

        {/* Top 3 Moves */}
        {topMoves.length > 0 && (
          <div className="mb-8 bg-gray-900 rounded-xl p-6 border border-gray-800">
            <h2 className="text-2xl font-bold mb-4">This Week's Top 3 Moves</h2>
            <div className="space-y-4">
              {topMoves.map((move, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="font-semibold text-white">{move.description}</div>
                    <div className="text-green-400 font-medium">+{move.projected_gain.toFixed(1)} points</div>
                  </div>
                  <button
                    onClick={() => handleApplyMove(move)}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Alerts List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold mb-4">Active Alerts</h2>
          
          {alerts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400">No active alerts for this week!</p>
            </div>
          ) : (
            alerts.map((alert, index) => (
              <div key={index} className="bg-gray-900 rounded-xl p-6 border border-gray-800">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4">
                    <div className={`text-2xl ${getAlertColor(alert.type)} p-2 rounded-lg`}>
                      {getAlertIcon(alert.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-lg font-semibold text-white">{alert.player}</h3>
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getAlertColor(alert.type)} text-white`}>
                          {alert.type.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-gray-300 mb-2">{alert.detail}</p>
                      <p className="text-sm text-gray-400">{alert.impact}</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    {alert.suggested_move && (
                      <button
                        onClick={() => handleViewFix(alert)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded transition-colors"
                      >
                        View Fix
                      </button>
                    )}
                    <button
                      onClick={() => dismissAlert(alert)}
                      className="px-3 py-1 bg-gray-600 hover:bg-gray-700 text-white text-sm font-medium rounded transition-colors"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 