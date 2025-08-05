import type { WaiverPlayer } from '../lib/api';

interface WaiversTableProps {
  players: WaiverPlayer[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  onPlayerClick?: (player: WaiverPlayer) => void;
}

export default function WaiversTable({ 
  players, 
  sortColumn, 
  sortDirection, 
  onSort,
  onPlayerClick 
}: WaiversTableProps) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'HIGH': return 'text-green-400 bg-green-400/10';
      case 'MEDIUM': return 'text-yellow-400 bg-yellow-400/10';
      case 'LOW': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400';
    }
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
              onClick={() => onSort('avg_points', sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              <div className="flex items-center justify-end">
                Avg Points
                <SortIcon field="avg_points" />
              </div>
            </th>
            <th 
              className="px-6 py-4 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => onSort('ros_projection', sortDirection === 'asc' ? 'desc' : 'asc')}
            >
              <div className="flex items-center justify-end">
                ROS Projection
                <SortIcon field="ros_projection" />
              </div>
            </th>
            <th className="px-6 py-4 text-center text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300">Priority</th>
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
              <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono text-gray-900 dark:text-white">
                {player.avg_points.toFixed(1)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono text-gray-900 dark:text-white">
                {player.ros_projection.toFixed(1)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(player.pickup_priority)}`}>
                  {player.pickup_priority}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-center text-xs text-gray-900 dark:text-white">
                {player.recent_trend}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 