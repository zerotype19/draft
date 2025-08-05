import { Env } from "./db";
import { predictiveModeling } from "./predictive-modeling";

interface SimulationMove {
  action: 'add' | 'remove' | 'swap';
  player_id?: string;
  player_name?: string;
  target_slot?: string;
  swap_with_player_id?: string;
}

interface SimulationRequest {
  mode: 'draft' | 'lineup' | 'waiver';
  roster: string[]; // player_ids
  moves: SimulationMove[];
  scoring?: string;
  includeInjuries?: boolean;
  rosterSlots?: {
    QB: number;
    RB: number;
    WR: number;
    TE: number;
    FLEX: number;
    DEF: number;
    K: number;
    Bench: number;
  };
}

interface PlayerImpact {
  player_id: string;
  player_name: string;
  position: string;
  team: string;
  projection: number;
  change: number;
  slot?: string;
  injuryStatus?: string;
  sosScore?: string;
  trend?: string;
}

interface SimulationResponse {
  baselineProjection: number;
  newProjection: number;
  difference: number;
  playerImpacts: PlayerImpact[];
  slotWarnings?: string[];
  optimalProjection?: number;
  optimalLineup?: PlayerImpact[];
}

export async function simulateRoster(
  env: Env,
  request: SimulationRequest
): Promise<SimulationResponse> {
  const { mode, roster, moves, scoring, includeInjuries = true, rosterSlots } = request;

  // Get current roster projections
  const baselinePlayers = await getRosterProjections(env, roster, scoring, includeInjuries);
  const baselineProjection = baselinePlayers.reduce((sum, p) => sum + p.projection, 0);

  // Apply moves based on mode
  let newRoster = [...roster];
  let slotWarnings: string[] = [];
  let optimalProjection: number | undefined;
  let optimalLineup: PlayerImpact[] | undefined;

  switch (mode) {
    case 'draft':
      newRoster = applyDraftMoves(newRoster, moves, rosterSlots, slotWarnings);
      break;
    case 'lineup':
      // For lineup mode, we need to distinguish starters vs bench
      // This is a simplified version - in full implementation, we'd track starter/bench assignments
      newRoster = applyLineupMoves(newRoster, moves);
      optimalLineup = await calculateOptimalLineup(env, newRoster, scoring, includeInjuries);
      optimalProjection = optimalLineup.reduce((sum, p) => sum + p.projection, 0);
      break;
    case 'waiver':
      newRoster = applyWaiverMoves(newRoster, moves);
      break;
  }

  // Get new roster projections
  const newPlayers = await getRosterProjections(env, newRoster, scoring, includeInjuries);
  const newProjection = newPlayers.reduce((sum, p) => sum + p.projection, 0);

  // Calculate player impacts
  const playerImpacts = calculatePlayerImpacts(baselinePlayers, newPlayers, moves);

  return {
    baselineProjection,
    newProjection,
    difference: newProjection - baselineProjection,
    playerImpacts,
    slotWarnings: slotWarnings.length > 0 ? slotWarnings : undefined,
    optimalProjection,
    optimalLineup
  };
}

async function getRosterProjections(
  env: Env,
  roster: string[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<PlayerImpact[]> {
  if (roster.length === 0) return [];

  // Try to find players by player_id first, then by name
  const players: PlayerImpact[] = [];
  
  for (const rosterItem of roster) {
    // First try to find by player_id
    let query = `
      SELECT p.player_id, p.name, p.position, p.team, s.total_points
      FROM players p
      JOIN stats_custom_scored s ON p.player_id = s.player_id
      WHERE p.player_id = ?
      AND s.season = 2024
      GROUP BY p.player_id
      ORDER BY s.total_points DESC
      LIMIT 1
    `;
    
    let result = await env.DB.prepare(query).bind(rosterItem).all();
    
    // If not found by player_id, try by name
    if (!result.results || result.results.length === 0) {
      query = `
        SELECT p.player_id, p.name, p.position, p.team, s.total_points
        FROM players p
        JOIN stats_custom_scored s ON p.player_id = s.player_id
        WHERE p.name = ?
        AND s.season = 2024
        GROUP BY p.player_id
        ORDER BY s.total_points DESC
        LIMIT 1
      `;
      result = await env.DB.prepare(query).bind(rosterItem).all();
    }
    
    if (result.results && result.results.length > 0) {
      const row = result.results[0];
      const avgPoints = row.total_points; // Simplified - in real implementation, calculate from weekly data
      
      // Apply enhanced predictive modeling
      const enhanced = await predictiveModeling.enhanceProjection(
        env,
        row.name,
        row.position,
        row.team,
        avgPoints,
        2024,
        includeInjuries
      );

      players.push({
        player_id: row.player_id,
        player_name: row.name,
        position: row.position,
        team: row.team,
        projection: enhanced.finalProjection,
        change: 0, // Will be calculated in calculatePlayerImpacts
        injuryStatus: enhanced.injuryStatus,
        sosScore: enhanced.sosScore,
        trend: enhanced.trend
      });
    }
  }

  return players;
}

function applyDraftMoves(
  roster: string[],
  moves: SimulationMove[],
  rosterSlots?: any,
  slotWarnings?: string[]
): string[] {
  let newRoster = [...roster];

  for (const move of moves) {
    if (move.action === 'add' && move.player_id) {
      newRoster.push(move.player_id);
      
      // Check slot limits if rosterSlots provided
      if (rosterSlots && move.target_slot) {
        const position = move.target_slot;
        const currentCount = newRoster.filter(id => {
          // This is simplified - in real implementation, we'd look up the player's position
          return true; // For now, just count all
        }).length;
        
        const slotLimit = rosterSlots[position as keyof typeof rosterSlots] || 0;
        if (currentCount > slotLimit) {
          slotWarnings?.push(`+${currentCount - slotLimit} over slot limit for ${position}`);
        }
      }
    } else if (move.action === 'remove' && move.player_id) {
      newRoster = newRoster.filter(id => id !== move.player_id);
    }
  }

  return newRoster;
}

function applyLineupMoves(
  roster: string[],
  moves: SimulationMove[]
): string[] {
  // For lineup mode, we're just swapping players in the roster
  // In a full implementation, we'd track starter/bench assignments
  let newRoster = [...roster];

  for (const move of moves) {
    if (move.action === 'swap' && move.player_id && move.swap_with_player_id) {
      const index1 = newRoster.indexOf(move.player_id);
      const index2 = newRoster.indexOf(move.swap_with_player_id);
      
      if (index1 !== -1 && index2 !== -1) {
        [newRoster[index1], newRoster[index2]] = [newRoster[index2], newRoster[index1]];
      }
    }
  }

  return newRoster;
}

function applyWaiverMoves(
  roster: string[],
  moves: SimulationMove[]
): string[] {
  let newRoster = [...roster];

  for (const move of moves) {
    if (move.action === 'swap' && move.player_id && move.swap_with_player_id) {
      // Remove the player being dropped
      newRoster = newRoster.filter(id => id !== move.swap_with_player_id);
      // Add the new player
      newRoster.push(move.player_id);
    }
  }

  return newRoster;
}

function calculatePlayerImpacts(
  baselinePlayers: PlayerImpact[],
  newPlayers: PlayerImpact[],
  moves: SimulationMove[]
): PlayerImpact[] {
  const impacts: PlayerImpact[] = [];

  // Calculate changes for players in the new roster
  for (const newPlayer of newPlayers) {
    const baselinePlayer = baselinePlayers.find(p => p.player_id === newPlayer.player_id);
    const change = baselinePlayer ? newPlayer.projection - baselinePlayer.projection : newPlayer.projection;
    
    impacts.push({
      ...newPlayer,
      change
    });
  }

  // Add removed players with negative projections
  for (const baselinePlayer of baselinePlayers) {
    const stillInRoster = newPlayers.some(p => p.player_id === baselinePlayer.player_id);
    if (!stillInRoster) {
      impacts.push({
        ...baselinePlayer,
        projection: 0,
        change: -baselinePlayer.projection
      });
    }
  }

  return impacts;
}

async function calculateOptimalLineup(
  env: Env,
  roster: string[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<PlayerImpact[]> {
  // This is a simplified optimal lineup calculation
  // In a full implementation, we'd use the actual lineup optimization algorithm
  const players = await getRosterProjections(env, roster, scoring, includeInjuries);
  
  // Sort by projection and take the top players for each position
  // This is a basic implementation - real optimal lineup would be more sophisticated
  return players.sort((a, b) => b.projection - a.projection).slice(0, 9); // Assuming 9 starters
} 