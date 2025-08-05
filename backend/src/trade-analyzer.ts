import { Env } from "./db";
import { predictiveModeling } from "./predictive-modeling";

interface TradeRequest {
  roster: string[]; // player_ids
  give: string[]; // player_ids to trade away
  receive: string[]; // player_ids to receive
  playoff_weeks: number[]; // e.g., [15, 16, 17]
  scoring?: string;
  includeInjuries?: boolean;
}

interface TradeAnalysis {
  current_ros_total: number;
  proposed_ros_total: number;
  net_change: number;
  weekly_breakdown: WeeklyProjection[];
  impact_weeks: ImpactWeek[];
  playoff_impact: PlayoffImpact;
  depth_analysis: DepthAnalysis;
}

interface WeeklyProjection {
  week: number;
  current_projection: number;
  proposed_projection: number;
  difference: number;
  is_playoff_week: boolean;
}

interface ImpactWeek {
  week: number;
  change: number;
  reason: string;
  is_playoff_week: boolean;
}

interface PlayoffImpact {
  current_playoff_total: number;
  proposed_playoff_total: number;
  playoff_change: number;
  playoff_weeks_affected: number[];
}

interface DepthAnalysis {
  position_impact: Record<string, number>;
  starter_impact: number;
  bench_impact: number;
}

export async function analyzeTrade(
  env: Env,
  request: TradeRequest
): Promise<TradeAnalysis> {
  const { roster, give, receive, playoff_weeks, scoring, includeInjuries = true } = request;

  // Calculate current roster projections
  const currentProjections = await getRosterProjections(env, roster, scoring, includeInjuries);
  const currentWeeklyProjections = await calculateWeeklyProjections(
    env, currentProjections, playoff_weeks, scoring, includeInjuries
  );

  // Calculate proposed roster projections
  const proposedRoster = [...roster];
  give.forEach(playerId => {
    const index = proposedRoster.indexOf(playerId);
    if (index > -1) proposedRoster.splice(index, 1);
  });
  receive.forEach(playerId => {
    if (!proposedRoster.includes(playerId)) {
      proposedRoster.push(playerId);
    }
  });

  const proposedProjections = await getRosterProjections(env, proposedRoster, scoring, includeInjuries);
  const proposedWeeklyProjections = await calculateWeeklyProjections(
    env, proposedProjections, playoff_weeks, scoring, includeInjuries
  );

  // Calculate totals
  const currentRosTotal = currentWeeklyProjections.reduce((sum, week) => sum + week.projection, 0);
  const proposedRosTotal = proposedWeeklyProjections.reduce((sum, week) => sum + week.projection, 0);
  const netChange = proposedRosTotal - currentRosTotal;

  // Generate weekly breakdown
  const weeklyBreakdown: WeeklyProjection[] = [];
  for (let week = 1; week <= 18; week++) {
    const currentWeek = currentWeeklyProjections.find(w => w.week === week);
    const proposedWeek = proposedWeeklyProjections.find(w => w.week === week);
    
    if (currentWeek && proposedWeek) {
      weeklyBreakdown.push({
        week,
        current_projection: currentWeek.projection,
        proposed_projection: proposedWeek.projection,
        difference: proposedWeek.projection - currentWeek.projection,
        is_playoff_week: playoff_weeks.includes(week)
      });
    }
  }

  // Identify impact weeks (changes of ±5 points or more)
  const impactWeeks: ImpactWeek[] = weeklyBreakdown
    .filter(week => Math.abs(week.difference) >= 5)
    .map(week => ({
      week: week.week,
      change: week.difference,
      reason: getImpactReason(week.difference, week.is_playoff_week),
      is_playoff_week: week.is_playoff_week
    }))
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));

  // Calculate playoff impact
  const playoffImpact = calculatePlayoffImpact(weeklyBreakdown, playoff_weeks);

  // Calculate depth analysis
  const depthAnalysis = calculateDepthAnalysis(currentProjections, proposedProjections);

  return {
    current_ros_total: currentRosTotal,
    proposed_ros_total: proposedRosTotal,
    net_change: netChange,
    weekly_breakdown: weeklyBreakdown,
    impact_weeks: impactWeeks,
    playoff_impact: playoffImpact,
    depth_analysis: depthAnalysis
  };
}

async function calculateWeeklyProjections(
  env: Env,
  players: any[],
  playoff_weeks: number[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<{ week: number; projection: number }[]> {
  const weeklyProjections: { week: number; projection: number }[] = [];

  for (let week = 1; week <= 18; week++) {
    let weekTotal = 0;
    
    for (const player of players) {
      // Apply weekly adjustments based on SOS and other factors
      const weeklyProjection = await calculatePlayerWeeklyProjection(
        env, player, week, playoff_weeks, includeInjuries
      );
      weekTotal += weeklyProjection;
    }

    weeklyProjections.push({ week, projection: weekTotal });
  }

  return weeklyProjections;
}

async function calculatePlayerWeeklyProjection(
  env: Env,
  player: any,
  week: number,
  playoff_weeks: number[],
  includeInjuries?: boolean
): Promise<number> {
  let projection = player.projection;

  // Apply SOS adjustment for this week
  const sosScore = await getSOSForWeek(env, player.team, player.position, week);
  if (sosScore === 'Hard') projection *= 0.95;
  else if (sosScore === 'Very Hard') projection *= 0.90;
  else if (sosScore === 'Easy') projection *= 1.05;

  // Apply playoff week adjustments
  if (playoff_weeks.includes(week)) {
    // Slight boost for playoff weeks to reflect increased importance
    projection *= 1.02;
  }

  // Apply injury adjustments if enabled
  if (includeInjuries && player.injury_status) {
    const injuryMultiplier = getInjuryMultiplier(player.injury_status);
    projection *= injuryMultiplier;
  }

  return projection;
}

async function getSOSForWeek(
  env: Env,
  team: string,
  position: string,
  week: number
): Promise<string> {
  // For now, use the existing SOS data structure
  // In a full implementation, this would query week-specific SOS data
  const query = `
    SELECT avg_rank_remaining
    FROM sos_data 
    WHERE team = ? AND position = ?
    LIMIT 1
  `;

  try {
    const result = await env.DB.prepare(query).bind(team, position).first();
    if (result && result.avg_rank_remaining) {
      const rank = result.avg_rank_remaining;
      if (rank <= 10) return 'Easy';
      if (rank <= 21) return 'Medium';
      if (rank <= 27) return 'Hard';
      return 'Very Hard';
    }
  } catch (error) {
    console.error('Error getting SOS for week:', error);
  }

  return 'Medium'; // Default fallback
}

function getInjuryMultiplier(status: string): number {
  const multipliers: Record<string, number> = {
    'Q': 0.85,
    'O': 0.00,
    'IR': 0.00,
    'PUP': 0.25,
    'Doubtful': 0.10,
    'Probable': 1.00
  };
  return multipliers[status] || 1.00;
}

function getImpactReason(difference: number, isPlayoffWeek: boolean): string {
  if (difference > 0) {
    return isPlayoffWeek ? 'Playoff week boost' : 'Improved matchup';
  } else {
    return isPlayoffWeek ? 'Playoff week concern' : 'Tougher matchup';
  }
}

function calculatePlayoffImpact(
  weeklyBreakdown: WeeklyProjection[],
  playoff_weeks: number[]
): PlayoffImpact {
  const playoffWeeks = weeklyBreakdown.filter(week => playoff_weeks.includes(week.week));
  
  const currentPlayoffTotal = playoffWeeks.reduce((sum, week) => sum + week.current_projection, 0);
  const proposedPlayoffTotal = playoffWeeks.reduce((sum, week) => sum + week.proposed_projection, 0);
  const playoffChange = proposedPlayoffTotal - currentPlayoffTotal;

  const playoffWeeksAffected = playoffWeeks
    .filter(week => Math.abs(week.difference) >= 2)
    .map(week => week.week);

  return {
    current_playoff_total: currentPlayoffTotal,
    proposed_playoff_total: proposedPlayoffTotal,
    playoff_change: playoffChange,
    playoff_weeks_affected: playoffWeeksAffected
  };
}

function calculateDepthAnalysis(
  currentPlayers: any[],
  proposedPlayers: any[]
): DepthAnalysis {
  // Group players by position
  const currentByPosition: Record<string, any[]> = {};
  const proposedByPosition: Record<string, any[]> = {};

  currentPlayers.forEach(player => {
    if (!currentByPosition[player.position]) currentByPosition[player.position] = [];
    currentByPosition[player.position].push(player);
  });

  proposedPlayers.forEach(player => {
    if (!proposedByPosition[player.position]) proposedByPosition[player.position] = [];
    proposedByPosition[player.position].push(player);
  });

  const positionImpact: Record<string, number> = {};
  
  // Calculate impact for each position
  for (const position of Object.keys(currentByPosition)) {
    const currentTotal = currentByPosition[position]?.reduce((sum, p) => sum + p.projection, 0) || 0;
    const proposedTotal = proposedByPosition[position]?.reduce((sum, p) => sum + p.projection, 0) || 0;
    positionImpact[position] = proposedTotal - currentTotal;
  }

  // Calculate starter vs bench impact (simplified)
  const currentStarters = currentPlayers.slice(0, 9); // Assume 9 starters
  const proposedStarters = proposedPlayers.slice(0, 9);
  
  const starterImpact = proposedStarters.reduce((sum, p) => sum + p.projection, 0) - 
                       currentStarters.reduce((sum, p) => sum + p.projection, 0);
  
  const benchImpact = (proposedPlayers.reduce((sum, p) => sum + p.projection, 0) - 
                       currentPlayers.reduce((sum, p) => sum + p.projection, 0)) - starterImpact;

  return {
    position_impact: positionImpact,
    starter_impact: starterImpact,
    bench_impact: benchImpact
  };
}

async function getRosterProjections(
  env: Env,
  roster: string[],
  scoring?: string,
  includeInjuries?: boolean
): Promise<any[]> {
  if (roster.length === 0) return [];

  const players: any[] = [];

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

      players.push({
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
  }

  return players;
} 