import type { Player } from '../lib/api';

type SortField = 'name' | 'position' | 'team' | 'total_points' | 'games_played' | 'avg_points';

interface PlayerTableProps {
  players: Player[];
  selectedPosition: string;
  onSort: (column: string, direction: 'asc' | 'desc') => void;
  sortColumn: string;
  sortDirection: 'asc' | 'desc';
  onPlayerClick: (player: Player) => void;
  watchlist: Set<string>;
  onToggleWatchlist: (playerId: string) => void;
  showWatchlistOnly: boolean;
}

// Position badge styling function with professional colors
function positionBadge(pos: string, isSelected: boolean = false) {
  const colors: Record<string, string> = {
    QB: "bg-blue-500/80 text-white",
    RB: "bg-green-500/80 text-white",
    WR: "bg-orange-500/80 text-white",
    TE: "bg-purple-500/80 text-white",
    K: "bg-pink-500/80 text-white",
    DEF: "bg-gray-500/80 text-white"
  };
  
  const baseColor = colors[pos] || "bg-gray-500/80 text-white";
  return isSelected ? baseColor.replace('/80', '/90') : baseColor;
}

export default function PlayerTable({ 
  players, 
  selectedPosition, 
  onSort,
  sortColumn,
  sortDirection,
  onPlayerClick,
  watchlist,
  onToggleWatchlist,
  showWatchlistOnly
}: PlayerTableProps) {
  const handleSort = (field: SortField) => {
    if (sortColumn === field) {
      onSort(field, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(field, 'desc');
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    let aValue: any = (a as any)[sortColumn];
    let bValue: any = (b as any)[sortColumn];
    
    if (sortColumn === 'name' || sortColumn === 'position' || sortColumn === 'team') {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  // Filter by watchlist if needed
  const filteredPlayers = showWatchlistOnly 
    ? sortedPlayers.filter(player => watchlist.has(player.name))
    : sortedPlayers;

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortColumn !== field) return <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">↕</span>;
    return <span className="ml-1 text-purple-600 dark:text-purple-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300 w-12">
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                checked={filteredPlayers.length > 0 && filteredPlayers.every(p => watchlist.has(p.name))}
                onChange={(e) => {
                  if (e.target.checked) {
                    filteredPlayers.forEach(p => onToggleWatchlist(p.name));
                  } else {
                    filteredPlayers.forEach(p => onToggleWatchlist(p.name));
                  }
                }}
              />
            </th>
            <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300 w-16 font-mono">Rank</th>
            <th 
              className="px-4 py-3 text-left text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center">
                Name
                <SortIcon field="name" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-left text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('position')}
            >
              <div className="flex items-center">
                Pos
                <SortIcon field="position" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-left text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('team')}
            >
              <div className="flex items-center">
                Team
                <SortIcon field="team" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => handleSort('total_points')}
            >
              <div className="flex items-center justify-end">
                Points
                <SortIcon field="total_points" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => handleSort('games_played')}
            >
              <div className="flex items-center justify-end">
                Games
                <SortIcon field="games_played" />
              </div>
            </th>
            <th 
              className="px-4 py-3 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => handleSort('avg_points')}
            >
              <div className="flex items-center justify-end">
                Avg
                <SortIcon field="avg_points" />
              </div>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredPlayers.map((player, index) => (
            <tr 
              key={player.name} 
              className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
              onClick={() => onPlayerClick(player)}
            >
              <td className="px-4 py-3 whitespace-nowrap">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500"
                  checked={watchlist.has(player.name)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleWatchlist(player.name);
                  }}
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm font-mono text-gray-900 dark:text-white">
                {index + 1}
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {player.name}
                </div>
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${positionBadge(player.position, selectedPosition === player.position)}`}>
                  {player.position}
                </span>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                {player.team}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                {player.total_points.toFixed(2)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                {player.games_played}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-mono text-gray-900 dark:text-white">
                {player.avg_points.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 