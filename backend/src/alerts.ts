import { Env } from "./db";
import { predictiveModeling } from "./predictive-modeling";

interface Alert {
  type: 'injury' | 'bad_matchup' | 'waiver_opportunity' | 'cold_streak' | 'lineup_optimization';
  player: string;
  detail: string;
  impact: string;
  projected_gain?: number;
  suggested_move?: {
    action: 'add' | 'remove' | 'swap';
    player_id?: string;
    swap_with_player_id?: string;
  };
}

interface RosterPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string;
  is_starter: boolean;
  projection: number;
  injury_status?: string;
  sos_score?: string;
  trend?: string;
}

interface WaiverPlayer {
  player_id: string;
  name: string;
  position: string;
  team: string;
  projection: number;
  injury_status?: string;
  sos_score?: string;
  trend?: string;
}

interface AlertsRequest {
  week: number;
  roster: string[]; // player_ids
  starters: string[]; // player_ids of starters
  scoring?: string;
  includeInjuries?: boolean;
}

export async function getAlerts(
  env: Env,
  request: AlertsRequest
): Promise<Alert[]> {
  const { week, roster, starters, scoring, includeInjuries = true } = request;
  const alerts: Alert[] = [];

  // Get roster players with projections
  const rosterPlayers = await getRosterProjections(env, roster, scoring, includeInjuries);
  const starterPlayers = rosterPlayers.filter(p => starters.includes(p.player_id));
  const benchPlayers = rosterPlayers.filter(p => !starters.includes(p.player_id));

  // Get waiver players
  const waiverPlayers = await getWaiverProjections(env, roster, scoring, includeInjuries);

  // 1. Injury Alerts
  for (const player of rosterPlayers) {
    if (player.injury_status && ['Q', 'O', 'IR', 'Doubtful'].includes(player.injury_status)) {
      const impact = getInjuryImpact(player.injury_status);
      alerts.push({
        type: 'injury',
        player: player.name,
        detail: `${player.injury_status} status`,
        impact: impact
      });
    }
  }

  // 2. Bad Matchup Alerts (only for starters)
  for (const player of starterPlayers) {
    if (player.sos_score === 'Hard') {
      alerts.push({
        type: 'bad_matchup',
        player: player.name,
        detail: `Facing top-5 defense vs ${player.position}`,
        impact: '-5% projection'
      });
    }
  }

  // 3. Hot Waiver Opportunities
  for (const waiverPlayer of waiverPlayers) {
    const samePositionStarters = starterPlayers.filter(p => p.position === waiverPlayer.position);
    if (samePositionStarters.length > 0) {
      const worstStarter = samePositionStarters.reduce((worst, current) => 
        current.projection < worst.projection ? current : worst
      );
      
      const improvement = ((waiverPlayer.projection - worstStarter.projection) / worstStarter.projection) * 100;
      
      if (improvement >= 10) {
        alerts.push({
          type: 'waiver_opportunity',
          player: waiverPlayer.name,
          detail: `+${improvement.toFixed(1)}% better than ${worstStarter.name}`,
          impact: `+${(waiverPlayer.projection - worstStarter.projection).toFixed(1)} points`,
          projected_gain: waiverPlayer.projection - worstStarter.projection,
          suggested_move: {
            action: 'swap',
            player_id: waiverPlayer.player_id,
            swap_with_player_id: worstStarter.player_id
          }
        });
      }
    }
  }

  // 4. Cold Streak Alerts
  for (const player of rosterPlayers) {
    if (player.trend === 'Cold') {
      const priority = starters.includes(player.player_id) ? 'HIGH' : 'MEDIUM';
      alerts.push({
        type: 'cold_streak',
        player: player.name,
        detail: `3-week average down 15%+ vs season (${priority} priority)`,
        impact: '-15% projection'
      });
    }
  }

  // 5. Lineup Optimization Alerts
  const currentProjection = starterPlayers.reduce((sum, p) => sum + p.projection, 0);
  const optimalLineup = await calculateOptimalLineup(env, rosterPlayers, scoring, includeInjuries);
  const optimalProjection = optimalLineup.reduce((sum, p) => sum + p.projection, 0);
  
  if (optimalProjection - currentProjection >= 5) {
    alerts.push({
      type: 'lineup_optimization',
      player: 'Team Lineup',
      detail: `Current lineup ${(optimalProjection - currentProjection).toFixed(1)} points below optimal`,
      impact: `+${(optimalProjection - currentProjection).toFixed(1)} points available`,
      projected_gain: optimalProjection - currentProjection
    });
  }

  // Sort by projected impact (highest first)
  return alerts.sort((a, b) => (b.projected_gain || 0) - (a.projected_gain || 0));
}

async function getRosterProjections(
  env: Env,
  roster: string[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<RosterPlayer[]> {
  if (roster.length === 0) return [];

  const players: RosterPlayer[] = [];

  for (const playerId of roster) {
    // Try to find player by player_id first, then by name
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

    let result = await env.DB.prepare(query).bind(playerId).all();

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
      result = await env.DB.prepare(query).bind(playerId).all();
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
        name: row.name,
        position: row.position,
        team: row.team,
        is_starter: false, // Will be set by caller
        projection: enhanced.finalProjection,
        injury_status: enhanced.injuryStatus,
        sos_score: enhanced.sosScore,
        trend: enhanced.trend
      });
    }
  }

  return players;
}

async function getWaiverProjections(
  env: Env,
  roster: string[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<WaiverPlayer[]> {
  // Get all players not in roster
  const query = `
    SELECT p.player_id, p.name, p.position, p.team, s.total_points
    FROM players p
    JOIN stats_custom_scored s ON p.player_id = s.player_id
    WHERE s.season = 2024
    AND p.player_id NOT IN (${roster.map(() => '?').join(',')})
    GROUP BY p.player_id
    ORDER BY s.total_points DESC
    LIMIT 100
  `;

  const result = await env.DB.prepare(query).bind(...roster).all();
  const waiverPlayers: WaiverPlayer[] = [];

  for (const row of result.results || []) {
    const avgPoints = row.total_points;

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

    waiverPlayers.push({
      player_id: row.player_id,
      name: row.name,
      position: row.position,
      team: row.team,
      projection: enhanced.finalProjection,
      injury_status: enhanced.injuryStatus,
      sos_score: enhanced.sosScore,
      trend: enhanced.trend
    });
  }

  return waiverPlayers;
}

async function calculateOptimalLineup(
  env: Env,
  rosterPlayers: RosterPlayer[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<RosterPlayer[]> {
  // Simplified optimal lineup calculation
  // In a full implementation, we'd use the actual lineup optimization algorithm
  return rosterPlayers.sort((a, b) => b.projection - a.projection).slice(0, 9); // Assuming 9 starters
}

function getInjuryImpact(status: string): string {
  const impacts: Record<string, string> = {
    'Q': '-15% projection',
    'O': '-100% projection',
    'IR': '-100% projection',
    'Doubtful': '-25% projection',
    'Probable': '-5% projection'
  };
  return impacts[status] || '-10% projection';
} 