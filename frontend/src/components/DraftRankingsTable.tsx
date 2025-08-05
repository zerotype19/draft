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

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700">
        <thead className="sticky top-0 z-10 bg-gray-900 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-700">
          <tr>
            <th className="px-4 py-2 text-sm font-semibold text-gray-300 text-left">Rank</th>
            <th className="px-4 py-2 text-sm font-semibold text-gray-300 text-left">Name</th>
            <th className="px-4 py-2 text-sm font-semibold text-gray-300 text-left">Pos</th>
            <th className="px-4 py-2 text-sm font-semibold text-gray-300 text-left">Team</th>
            <th 
              className="px-4 py-2 text-sm font-semibold text-gray-300 text-right cursor-pointer hover:text-white"
              onClick={() => onSort('total_points', sortDirection)}
            >
              Total Points {sortColumn === 'total_points' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-sm font-semibold text-gray-300 text-right cursor-pointer hover:text-white"
              onClick={() => onSort('avg_points', sortDirection)}
            >
              Avg Points {sortColumn === 'avg_points' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-sm font-semibold text-gray-300 text-right cursor-pointer hover:text-white"
              onClick={() => onSort('consistency_score', sortDirection)}
            >
              Consistency {sortColumn === 'consistency_score' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-sm font-semibold text-gray-300 text-right cursor-pointer hover:text-white"
              onClick={() => onSort('boom_rate', sortDirection)}
            >
              Boom % {sortColumn === 'boom_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-sm font-semibold text-gray-300 text-right cursor-pointer hover:text-white"
              onClick={() => onSort('bust_rate', sortDirection)}
            >
              Bust % {sortColumn === 'bust_rate' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-sm font-semibold text-gray-300 text-center cursor-pointer hover:text-white"
              onClick={() => onSort('tier', sortDirection)}
            >
              Tier {sortColumn === 'tier' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {players.map((player, i) => (
            <tr 
              key={player.name}
              className={`hover:bg-gray-800/50 transition-colors ${onPlayerClick ? 'cursor-pointer' : ''}`}
              onClick={() => onPlayerClick?.(player)}
            >
              <td className="px-4 py-2 text-sm text-gray-300">{i + 1}</td>
              <td className="px-4 py-2 text-sm font-medium text-white">{player.name}</td>
              <td className="px-4 py-2 text-sm">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${getPositionColor(player.position)}`}>
                  {player.position}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-gray-300">{player.team}</td>
              <td className="px-4 py-2 text-sm text-gray-300 text-right">{player.total_points.toFixed(1)}</td>
              <td className="px-4 py-2 text-sm text-gray-300 text-right">{player.avg_points.toFixed(1)}</td>
              <td className={`px-4 py-2 text-sm text-right font-medium ${getConsistencyColor(player.consistency_score)}`}>
                {(player.consistency_score * 100).toFixed(0)}%
              </td>
              <td className={`px-4 py-2 text-sm text-right font-medium ${getBoomBustColor(player.boom_rate, player.bust_rate)}`}>
                {player.boom_rate.toFixed(0)}%
              </td>
              <td className={`px-4 py-2 text-sm text-right font-medium ${getBoomBustColor(player.boom_rate, player.bust_rate)}`}>
                {player.bust_rate.toFixed(0)}%
              </td>
              <td className={`px-4 py-2 text-sm text-center font-bold ${getTierColor(player.tier)}`}>
                {player.tier}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 