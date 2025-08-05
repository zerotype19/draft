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
              onClick={() => onSort('projected_points', sortDirection)}
            >
              Projected {sortColumn === 'projected_points' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-sm font-semibold text-gray-300 text-right cursor-pointer hover:text-white"
              onClick={() => onSort('weighted_avg', sortDirection)}
            >
              Weighted Avg {sortColumn === 'weighted_avg' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-sm font-semibold text-gray-300 text-center cursor-pointer hover:text-white"
              onClick={() => onSort('opponent_rank', sortDirection)}
            >
              Opp Rank {sortColumn === 'opponent_rank' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-4 py-2 text-sm font-semibold text-gray-300 text-center">Recommendation</th>
            <th className="px-4 py-2 text-sm font-semibold text-gray-300 text-left">Reason</th>
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
              <td className="px-4 py-2 text-sm text-gray-300 text-right font-medium">
                {player.projected_points.toFixed(1)}
              </td>
              <td className="px-4 py-2 text-sm text-gray-300 text-right">
                {player.weighted_avg.toFixed(1)}
              </td>
              <td className={`px-4 py-2 text-sm text-center font-medium ${getOpponentRankColor(player.opponent_rank)}`}>
                {player.opponent_rank}
              </td>
              <td className="px-4 py-2 text-sm text-center">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${getRecommendationColor(player.recommendation)}`}>
                  {player.recommendation}
                </span>
              </td>
              <td className="px-4 py-2 text-sm text-gray-400 max-w-xs truncate" title={player.reason}>
                {player.reason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 