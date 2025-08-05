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

// Position badge styling function with professional colors and opacity
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
    return <span className="ml-1 text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
        <thead className="sticky top-0 z-10 bg-gray-900 dark:bg-gray-900 border-b border-gray-700 dark:border-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-12">
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600"
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
            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300 w-16">Rank</th>
            <th 
              className="px-4 py-3 text-left text-sm font-semibold cursor-pointer group text-gray-300 hover:text-white"
              onClick={() => handleSort('name')}
            >
              Name<SortIcon field="name" />
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-semibold cursor-pointer group text-gray-300 hover:text-white w-20"
              onClick={() => handleSort('position')}
            >
              Pos<SortIcon field="position" />
            </th>
            <th 
              className="px-4 py-3 text-left text-sm font-semibold cursor-pointer group text-gray-300 hover:text-white w-16"
              onClick={() => handleSort('team')}
            >
              Team<SortIcon field="team" />
            </th>
            <th 
              className="px-4 py-3 text-right text-sm font-semibold cursor-pointer group text-gray-300 hover:text-white"
              onClick={() => handleSort('total_points')}
            >
              Points<SortIcon field="total_points" />
            </th>
            <th 
              className="px-4 py-3 text-right text-sm font-semibold cursor-pointer group text-gray-300 hover:text-white w-20"
              onClick={() => handleSort('games_played')}
            >
              Games<SortIcon field="games_played" />
            </th>
            <th 
              className="px-4 py-3 text-right text-sm font-semibold cursor-pointer group text-gray-300 hover:text-white w-20"
              onClick={() => handleSort('avg_points')}
            >
              Avg<SortIcon field="avg_points" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {filteredPlayers.map((player, index) => (
            <tr 
              key={player.name + index}
              className={`hover:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer ${
                index < 3 && selectedPosition === player.position ? "bg-gradient-to-r from-yellow-600/20 to-transparent" : ""
              } ${
                index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"
              }`}
              onClick={() => onPlayerClick(player)}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600"
                  checked={watchlist.has(player.name)}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleWatchlist(player.name);
                  }}
                />
              </td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-300">{index + 1}</td>
              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{player.name}</td>
              <td className="px-4 py-3">
                <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${positionBadge(player.position, selectedPosition === player.position)}`}>
                  {player.position}
                </span>
              </td>
              <td className="px-4 py-3 font-medium text-gray-700 dark:text-gray-300">{player.team}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900 dark:text-white">{player.total_points.toFixed(2)}</td>
              <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">{player.games_played}</td>
              <td className="px-4 py-3 text-right font-mono font-semibold text-gray-900 dark:text-white">{player.avg_points.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 