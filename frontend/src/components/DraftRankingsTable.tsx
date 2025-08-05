import type { DraftPlayer } from '../lib/api';

interface DraftRankingsTableProps {
  players: DraftPlayer[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onPlayerClick?: (player: DraftPlayer) => void;
}

export default function DraftRankingsTable({ 
  players, 
  sortColumn, 
  sortDirection, 
  onSort,
  onPlayerClick 
}: DraftRankingsTableProps) {
  const getConsistencyColor = (score: number) => {
    if (score >= 0.8) return 'text-green-400';
    if (score >= 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getBoomBustColor = (boom: number, bust: number) => {
    if (boom >= 50 && bust <= 20) return 'text-green-400';
    if (boom >= 30 && bust <= 30) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTierColor = (tier: number) => {
    const colors = ['text-red-400', 'text-orange-400', 'text-yellow-400', 'text-green-400', 'text-blue-400'];
    return colors[Math.min(tier - 1, colors.length - 1)];
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

  const SortIcon = ({ field }: { field: string }) => {
    if (sortColumn !== field) return <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">↕</span>;
    return <span className="ml-1 text-purple-600 dark:text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300 font-mono">Rank</th>
            <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Name</th>
            <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Pos</th>
            <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Team</th>
            <th className="px-6 py-4 text-center text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Status</th>
            <th className="px-6 py-4 text-center text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">SOS</th>
            <th 
              className="px-6 py-4 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => onSort('total_points', sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              <div className="flex items-center justify-end">
                Total Points
                <SortIcon field="total_points" />
              </div>
            </th>
            <th 
              className="px-6 py-4 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => onSort('avg_points', sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              <div className="flex items-center justify-end">
                Avg Points
                <SortIcon field="avg_points" />
              </div>
            </th>
            <th className="px-6 py-4 text-center text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Tier</th>
            <th className="px-6 py-4 text-center text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Consistency</th>
            <th className="px-6 py-4 text-center text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Boom/Bust</th>
            <th className="px-6 py-4 text-center text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Trend</th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {players.map((player, index) => (
            <tr 
              key={player.name} 
              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => onPlayerClick?.(player)}
            >
              <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-900 dark:text-white">
                {index + 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-xs font-medium text-gray-900 dark:text-white">
                  {player.name}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                  {player.position}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900 dark:text-white">
                {player.team}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {player.injuryStatus && (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getInjuryStatusColor(player.injuryStatus)}`}>
                    {player.injuryStatus}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                {player.sosScore && (
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSOSColor(player.sosScore)}`}>
                    {player.sosScore}
                  </span>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono text-gray-900 dark:text-white">
                {player.total_points.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono text-gray-900 dark:text-white">
                {player.avg_points.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`text-xs font-semibold ${getTierColor(player.tier)}`}>
                  {player.tier}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`text-xs font-semibold ${getConsistencyColor(player.consistency_score)}`}>
                  {(player.consistency_score * 100).toFixed(0)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`text-xs font-semibold ${getBoomBustColor(player.boom_rate, player.bust_rate)}`}>
                  {player.boom_rate.toFixed(0)}%/{player.bust_rate.toFixed(0)}%
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className="text-xs">
                  {getTrendIcon(player.trend)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 