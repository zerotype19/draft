import type { RecommendationPlayer } from '../lib/api';

interface RecommendationsTableProps {
  players: RecommendationPlayer[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onPlayerClick?: (player: RecommendationPlayer) => void;
}

export default function RecommendationsTable({ 
  players, 
  sortColumn, 
  sortDirection, 
  onSort,
  onPlayerClick 
}: RecommendationsTableProps) {
  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'START': return 'text-green-400 bg-green-400/10';
      case 'SIT': return 'text-red-400 bg-red-400/10';
      case 'FLEX': return 'text-yellow-400 bg-yellow-400/10';
      default: return 'text-gray-400';
    }
  };

  const getOpponentRankColor = (rank: number) => {
    if (rank <= 8) return 'text-red-400'; // Tough defense
    if (rank <= 16) return 'text-yellow-400'; // Above average
    if (rank <= 24) return 'text-blue-400'; // Average
    return 'text-green-400'; // Favorable
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
            <th 
              className="px-6 py-4 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => onSort('projected_points', sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              <div className="flex items-center justify-end">
                Projected
                <SortIcon field="projected_points" />
              </div>
            </th>
            <th 
              className="px-6 py-4 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => onSort('weighted_avg', sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              <div className="flex items-center justify-end">
                Weighted Avg
                <SortIcon field="weighted_avg" />
              </div>
            </th>
            <th 
              className="px-6 py-4 text-center text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => onSort('opponent_rank', sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              <div className="flex items-center justify-center">
                Opp Rank
                <SortIcon field="opponent_rank" />
              </div>
            </th>
            <th className="px-6 py-4 text-center text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Recommendation</th>
            <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Reason</th>
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
              <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono text-gray-900 dark:text-white">
                {player.projected_points.toFixed(1)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono text-gray-900 dark:text-white">
                {player.weighted_avg.toFixed(1)}
              </td>
              <td className={`px-6 py-4 whitespace-nowrap text-xs text-center font-medium ${getOpponentRankColor(player.opponent_rank)}`}>
                {player.opponent_rank}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRecommendationColor(player.recommendation)}`}>
                  {player.recommendation}
                </span>
              </td>
              <td className="px-6 py-4 text-xs text-gray-900 dark:text-white">
                <div className="max-w-xs truncate">
                  {player.reason}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 