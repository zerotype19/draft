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
    QB: "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg",
    RB: "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg",
    WR: "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg",
    TE: "bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg",
    K: "bg-gradient-to-r from-pink-500 to-pink-600 text-white shadow-lg",
    DEF: "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg"
  };
  
  const baseColor = colors[pos] || "bg-gradient-to-r from-gray-500 to-gray-600 text-white shadow-lg";
  return isSelected ? baseColor.replace('shadow-lg', 'shadow-xl ring-2 ring-white/50') : baseColor;
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
    <div className="overflow-x-auto rounded-xl shadow-2xl">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800">
          <tr>
            <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300 w-12">
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 shadow-sm"
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
            <th className="px-6 py-4 text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-300 w-16 font-mono">Rank</th>
            <th 
              className="px-6 py-4 text-left text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('name')}
            >
              <div className="flex items-center">
                Name
                <SortIcon field="name" />
              </div>
            </th>
            <th 
              className="px-6 py-4 text-left text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('position')}
            >
              <div className="flex items-center">
                Pos
                <SortIcon field="position" />
              </div>
            </th>
            <th 
              className="px-6 py-4 text-left text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200"
              onClick={() => handleSort('team')}
            >
              <div className="flex items-center">
                Team
                <SortIcon field="team" />
              </div>
            </th>
            <th 
              className="px-6 py-4 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => handleSort('total_points')}
            >
              <div className="flex items-center justify-end">
                Points
                <SortIcon field="total_points" />
              </div>
            </th>
            <th 
              className="px-6 py-4 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
              onClick={() => handleSort('games_played')}
            >
              <div className="flex items-center justify-end">
                Games
                <SortIcon field="games_played" />
              </div>
            </th>
            <th 
              className="px-6 py-4 text-right text-xs uppercase tracking-wide cursor-pointer group text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-200 font-mono"
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
              className="hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 dark:hover:from-purple-900/20 dark:hover:to-blue-900/20 transition-all duration-200 cursor-pointer group"
              onClick={() => onPlayerClick(player)}
            >
              <td className="px-6 py-4 whitespace-nowrap">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600 text-purple-600 focus:ring-purple-500 shadow-sm"
                  checked={watchlist.has(player.name)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleWatchlist(player.name);
                  }}
                />
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-gray-900 dark:text-white font-bold">
                {index + 1}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-xs font-semibold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                  {player.name}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-3 py-1.5 text-xs font-bold rounded-full ${positionBadge(player.position, selectedPosition === player.position)}`}>
                  {player.position}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-900 dark:text-white font-medium">
                {player.team}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono text-gray-900 dark:text-white font-bold">
                {player.total_points.toFixed(2)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono text-gray-900 dark:text-white">
                {player.games_played}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-xs text-right font-mono text-gray-900 dark:text-white font-bold">
                {player.avg_points.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 