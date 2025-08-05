import type { WaiverPlayer } from '../lib/api';

interface WaiversTableProps {
  players: WaiverPlayer[];
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onSort: (column: string) => void;
  onPlayerClick?: (player: WaiverPlayer) => void;
}

export default function WaiversTable({ 
  players, 
  sortColumn, 
  sortDirection, 
  onSort,
  onPlayerClick 
}: WaiversTableProps) {
  const getPickupPriorityColor = (priority: string) => {
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
              onClick={() => onSort('ros_projection')}
            >
              ROS Projection {sortColumn === 'ros_projection' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th 
              className="px-4 py-2 text-sm font-semibold text-gray-300 text-right cursor-pointer hover:text-white"
              onClick={() => onSort('avg_points')}
            >
              Avg Points {sortColumn === 'avg_points' && (sortDirection === 'asc' ? '↑' : '↓')}
            </th>
            <th className="px-4 py-2 text-sm font-semibold text-gray-300 text-center">Breakout</th>
            <th className="px-4 py-2 text-sm font-semibold text-gray-300 text-center">Trend</th>
            <th className="px-4 py-2 text-sm font-semibold text-gray-300 text-center">Priority</th>
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
                {player.ros_projection.toFixed(1)}
              </td>
              <td className="px-4 py-2 text-sm text-gray-300 text-right">
                {player.avg_points.toFixed(1)}
              </td>
              <td className="px-4 py-2 text-sm text-center">
                {player.breakout_flag && (
                  <span className="text-2xl" title="Recent breakout candidate">🔥</span>
                )}
              </td>
              <td className="px-4 py-2 text-sm text-center text-gray-300">
                {player.recent_trend}
              </td>
              <td className="px-4 py-2 text-sm text-center">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${getPickupPriorityColor(player.pickup_priority)}`}>
                  {player.pickup_priority}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 