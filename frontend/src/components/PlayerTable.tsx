import { useState } from "react";
import type { Player } from "../lib/api";

type SortField = 'name' | 'position' | 'team' | 'total_points' | 'games_played' | 'avg_points';
type SortDirection = 'asc' | 'desc';

interface PlayerTableProps {
  players: Player[];
}

// Position badge styling function
function positionBadge(pos: string) {
  const colors: Record<string, string> = {
    QB: "bg-blue-500 text-white",
    RB: "bg-green-500 text-white",
    WR: "bg-purple-500 text-white",
    TE: "bg-yellow-500 text-black",
    K: "bg-orange-500 text-white",
    DEF: "bg-gray-700 text-white"
  };
  return colors[pos] || "bg-gray-300 text-black";
}

export default function PlayerTable({ players }: PlayerTableProps) {
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
    if (sortField !== field) return null;
    return <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-300 text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left">Rank</th>
            <th 
              className="border p-2 text-left cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('name')}
            >
              Name<SortIcon field="name" />
            </th>
            <th 
              className="border p-2 text-left cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('position')}
            >
              Pos<SortIcon field="position" />
            </th>
            <th 
              className="border p-2 text-left cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('team')}
            >
              Team<SortIcon field="team" />
            </th>
            <th 
              className="border p-2 text-left cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('total_points')}
            >
              Points<SortIcon field="total_points" />
            </th>
            <th 
              className="border p-2 text-left cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('games_played')}
            >
              Games<SortIcon field="games_played" />
            </th>
            <th 
              className="border p-2 text-left cursor-pointer hover:bg-gray-200"
              onClick={() => handleSort('avg_points')}
            >
              Avg<SortIcon field="avg_points" />
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedPlayers.map((player, i) => (
            <tr key={player.name + i} className="hover:bg-gray-50">
              <td className="border p-2">{i + 1}</td>
              <td className="border p-2 font-medium">{player.name}</td>
              <td className="border p-2">
                <span className={`px-2 py-1 rounded text-xs ${positionBadge(player.position)}`}>
                  {player.position}
                </span>
              </td>
              <td className="border p-2">{player.team || '-'}</td>
              <td className="border p-2 font-mono">{player.total_points.toFixed(2)}</td>
              <td className="border p-2">{player.games_played}</td>
              <td className="border p-2 font-mono">{player.avg_points.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 