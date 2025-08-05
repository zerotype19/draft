import type { Player } from '../lib/api';

interface PlayerModalProps {
  player: Player | null;
  isOpen: boolean;
  onClose: () => void;
}

interface PlayerStats {
  week: number;
  points: number;
}

export default function PlayerModal({ player, isOpen, onClose }: PlayerModalProps) {
  if (!isOpen || !player) return null;

  // Mock weekly stats for demonstration
  const weeklyStats: PlayerStats[] = [
    { week: 1, points: 18.5 },
    { week: 2, points: 22.3 },
    { week: 3, points: 15.8 },
    { week: 4, points: 25.1 },
    { week: 5, points: 19.7 },
    { week: 6, points: 28.4 },
    { week: 7, points: 16.2 },
    { week: 8, points: 23.9 },
    { week: 9, points: 21.5 },
    { week: 10, points: 27.8 },
    { week: 11, points: 18.3 },
    { week: 12, points: 24.6 },
    { week: 13, points: 20.1 },
    { week: 14, points: 26.7 },
    { week: 15, points: 17.9 },
    { week: 16, points: 29.2 },
    { week: 17, points: 22.8 },
    { week: 18, points: 19.4 }
  ];

  const maxPoints = Math.max(...weeklyStats.map(s => s.points));
  const minPoints = Math.min(...weeklyStats.map(s => s.points));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{player.name}</h2>
            <div className="flex items-center gap-4 mt-2">
              <span className={`px-3 py-1 text-sm font-bold rounded-full ${getPositionColor(player.position)}`}>
                {player.position}
              </span>
              <span className="text-gray-600 dark:text-gray-300 font-medium">{player.team}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Season Stats */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Points</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{player.total_points.toFixed(1)}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Games Played</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{player.games_played}</div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="text-sm text-gray-600 dark:text-gray-400">Avg Points</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{player.avg_points.toFixed(1)}</div>
            </div>
          </div>

          {/* Weekly Performance Chart */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Performance</h3>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <div className="flex items-end justify-between h-32 gap-1">
                {weeklyStats.map((stat) => {
                  const height = ((stat.points - minPoints) / (maxPoints - minPoints)) * 100;
                  const isHigh = stat.points >= 25;
                  const isLow = stat.points <= 15;
                  
                  return (
                    <div key={stat.week} className="flex flex-col items-center flex-1">
                      <div 
                        className={`w-full rounded-t transition-all duration-200 ${
                          isHigh ? 'bg-green-500' : isLow ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ height: `${Math.max(height, 5)}%` }}
                      />
                      <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {stat.week}
                      </div>
                      <div className="text-xs font-medium text-gray-900 dark:text-white">
                        {stat.points.toFixed(1)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Performance Analysis */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Best Week</h4>
              <div className="text-2xl font-bold text-green-600">
                {Math.max(...weeklyStats.map(s => s.points)).toFixed(1)} pts
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Week {weeklyStats.find(s => s.points === Math.max(...weeklyStats.map(s => s.points)))?.week}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 dark:text-white mb-2">Worst Week</h4>
              <div className="text-2xl font-bold text-red-600">
                {Math.min(...weeklyStats.map(s => s.points)).toFixed(1)} pts
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Week {weeklyStats.find(s => s.points === Math.min(...weeklyStats.map(s => s.points)))?.week}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function getPositionColor(position: string): string {
  const colors: Record<string, string> = {
    QB: "bg-blue-500/80 text-white",
    RB: "bg-green-500/80 text-white",
    WR: "bg-orange-500/80 text-white",
    TE: "bg-purple-500/80 text-white",
    K: "bg-pink-500/80 text-white",
    DEF: "bg-gray-500/80 text-white"
  };
  return colors[position] || "bg-gray-500/80 text-white";
} 