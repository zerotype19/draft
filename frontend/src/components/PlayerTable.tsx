import { useState } from "react";
import type { Player } from "../lib/api";

type SortField = 'name' | 'position' | 'team' | 'total_points' | 'games_played' | 'avg_points';
type SortDirection = 'asc' | 'desc';

interface PlayerTableProps {
  players: Player[];
  selectedPosition?: string;
}

// Position badge styling function with modern colors
function positionBadge(pos: string, isSelected: boolean = false) {
  const colors: Record<string, string> = {
    QB: "bg-blue-500/80 text-white",
    RB: "bg-green-500/80 text-white",
    WR: "bg-purple-500/80 text-white",
    TE: "bg-yellow-500/80 text-black",
    K: "bg-orange-500/80 text-white",
    DEF: "bg-gray-600/80 text-white"
  };
  
  const baseColor = colors[pos] || "bg-gray-400/80 text-black";
  return isSelected ? baseColor.replace('/80', '/90') : baseColor;
}

export default function PlayerTable({ players, selectedPosition }: PlayerTableProps) {
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
    if (sortField !== field) return <span className="text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity">↕</span>;
    return <span className="ml-1 text-blue-400">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-700 text-sm">
        <thead className="sticky top-0 bg-gray-900 z-10">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-gray-300">Rank</th>
            <th 
              className="px-4 py-3 text-left font-semibold text-gray-300 cursor-pointer hover:text-white group"
              onClick={() => handleSort('name')}
            >
              Name<SortIcon field="name" />
            </th>
            <th 
              className="px-4 py-3 text-left font-semibold text-gray-300 cursor-pointer hover:text-white group"
              onClick={() => handleSort('position')}
            >
              Pos<SortIcon field="position" />
            </th>
            <th 
              className="px-4 py-3 text-left font-semibold text-gray-300 cursor-pointer hover:text-white group"
              onClick={() => handleSort('team')}
            >
              Team<SortIcon field="team" />
            </th>
            <th 
              className="px-4 py-3 text-right font-semibold text-gray-300 cursor-pointer hover:text-white group"
              onClick={() => handleSort('total_points')}
            >
              Points<SortIcon field="total_points" />
            </th>
            <th 
              className="px-4 py-3 text-right font-semibold text-gray-300 cursor-pointer hover:text-white group"
              onClick={() => handleSort('games_played')}
            >
              Games<SortIcon field="games_played" />
            </th>
            <th 
              className="px-4 py-3 text-right font-semibold text-gray-300 cursor-pointer hover:text-white group"
              onClick={() => handleSort('avg_points')}
            >
              Avg<SortIcon field="avg_points" />
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {sortedPlayers.map((player, i) => (
            <tr 
              key={player.name + i} 
              className={`hover:bg-gray-800/50 transition-colors ${
                i < 5 ? "bg-gradient-to-r from-yellow-600/20 to-transparent" : ""
              } ${i % 2 === 0 ? "bg-gray-800" : "bg-gray-900"}`}
            >
              <td className="px-4 py-2 text-gray-300">{i + 1}</td>
              <td className="px-4 py-2 font-medium text-white">{player.name}</td>
              <td className="px-4 py-2">
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${positionBadge(player.position, selectedPosition === player.position)}`}>
                  {player.position}
                </span>
              </td>
              <td className="px-4 py-2 text-gray-300">{player.team}</td>
              <td className="px-4 py-2 text-right font-mono text-white">{player.total_points.toFixed(2)}</td>
              <td className="px-4 py-2 text-right text-gray-300">{player.games_played}</td>
              <td className="px-4 py-2 text-right font-mono text-white">{player.avg_points.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 