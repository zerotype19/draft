import { useState } from "react";
import type { Player } from "../lib/api";

type SortField = 'name' | 'position' | 'team' | 'total_points' | 'games_played' | 'avg_points';
type SortDirection = 'asc' | 'desc';

interface PlayerTableProps {
  players: Player[];
  selectedPosition?: string;
  darkMode?: boolean;
}

// Position badge styling function with professional colors
function positionBadge(pos: string, isSelected: boolean = false) {
  const colors: Record<string, string> = {
    QB: "bg-blue-600 text-white",
    RB: "bg-green-600 text-white",
    WR: "bg-orange-500 text-white",
    TE: "bg-purple-600 text-white",
    K: "bg-yellow-500 text-black",
    DEF: "bg-gray-700 text-white"
  };
  
  const baseColor = colors[pos] || "bg-gray-500 text-white";
  return isSelected ? baseColor.replace('600', '700').replace('500', '600') : baseColor;
}

export default function PlayerTable({ players, selectedPosition, darkMode = true }: PlayerTableProps) {
  const [sortField, setSortField] = useState<SortField>('total_points');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedPlayers = [...players].sort((a, b) => {
    let aValue: any = a[sortField];
    let bValue: any = b[sortField];
    
    if (sortField === 'name' || sortField === 'position' || sortField === 'team') {
      aValue = String(aValue || '').toLowerCase();
      bValue = String(bValue || '').toLowerCase();
    }
    
    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">↕</span>;
    return <span className="ml-1 text-blue-500">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
        <thead className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Rank</th>
            <th 
              className="px-4 py-3 text-left font-semibold cursor-pointer group text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => handleSort('name')}
            >
              Name<SortIcon field="name" />
            </th>
            <th 
              className="px-4 py-3 text-left font-semibold cursor-pointer group text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => handleSort('position')}
            >
              Pos<SortIcon field="position" />
            </th>
            <th 
              className="px-4 py-3 text-left font-semibold cursor-pointer group text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => handleSort('team')}
            >
              Team<SortIcon field="team" />
            </th>
            <th 
              className="px-4 py-3 text-right font-semibold cursor-pointer group text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => handleSort('total_points')}
            >
              Points<SortIcon field="total_points" />
            </th>
            <th 
              className="px-4 py-3 text-right font-semibold cursor-pointer group text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => handleSort('games_played')}
            >
              Games<SortIcon field="games_played" />
            </th>
            <th 
              className="px-4 py-3 text-right font-semibold cursor-pointer group text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              onClick={() => handleSort('avg_points')}
            >
              Avg<SortIcon field="avg_points" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {sortedPlayers.map((player, index) => (
            <tr 
              key={player.name + index}
              className={`hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer ${
                index < 5 ? "bg-gradient-to-r from-yellow-100/50 to-transparent dark:from-yellow-900/20" : ""
              } ${
                index % 2 === 0 ? "bg-white dark:bg-gray-800" : "bg-gray-50 dark:bg-gray-900"
              }`}
            >
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-300">{index + 1}</td>
              <td className="px-4 py-3 font-semibold text-gray-900 dark:text-white">{player.name}</td>
              <td className="px-4 py-3">
                <span className={`px-3 py-1 text-xs font-bold rounded-full ${positionBadge(player.position, selectedPosition === player.position)}`}>
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