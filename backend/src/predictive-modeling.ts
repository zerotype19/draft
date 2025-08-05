import { Env } from "./db";

// Injury status multipliers
const INJURY_MULTIPLIERS: Record<string, number> = {
  'Q': 0.85,      // Questionable
  'O': 0.00,      // Out
  'IR': 0.00,     // Injured Reserve
  'PUP': 0.25,    // Physically Unable to Perform
  'Doubtful': 0.10,
  'Probable': 1.00
};

// SOS adjustment thresholds
const SOS_EASY_THRESHOLD = 10;
const SOS_HARD_THRESHOLD = 22;
const SOS_EASY_BONUS = 0.05;  // +5%
const SOS_HARD_PENALTY = 0.05; // -5%

// Trend thresholds
const TREND_HOT_THRESHOLD = 0.15;  // 15% above average
const TREND_COLD_THRESHOLD = -0.15; // 15% below average

interface InjuryData {
  [playerName: string]: string;
}

interface SOSData {
  [key: string]: number; // "TEAM_POSITION" -> avg_rank
}

interface PlayerProjection {
  name: string;
  position: string;
  team: string;
  baseProjection: number;
  injuryStatus?: string;
  injuryMultiplier?: number;
  sosScore?: string;
  sosAdjustment?: number;
  trend?: string;
  finalProjection: number;
}

export class PredictiveModeling {
  private injuryData: InjuryData = {};
  private sosData: SOSData = {};

  constructor() {
    this.loadInjuryData();
    this.loadSOSData();
  }

  private loadInjuryData() {
    // In a real implementation, this would load from CSV
    // For now, we'll use a subset of the data
    this.injuryData = {
      'Josh Allen': 'Q',
      'Lamar Jackson': 'O',
      'Patrick Mahomes': 'Probable',
      'Jalen Hurts': 'Q',
      'C.J. Stroud': 'IR',
      'Deebo Samuel': 'Q',
      'T.J. Hockenson': 'IR',
      'Mark Andrews': 'IR'
    };
  }

  private loadSOSData() {
    // In a real implementation, this would load from CSV
    // For now, we'll use a subset of the data
    this.sosData = {
      'BAL_QB': 8,
      'BUF_QB': 6,
      'KC_QB': 6,
      'MIA_QB': 6,
      'PHI_QB': 6,
      'SF_QB': 6,
      'DET_QB': 6,
      'CIN_QB': 12,
      'DEN_QB': 14,
      'LV_QB': 14,
      'NE_QB': 14,
      'WAS_QB': 14,
      'CAR_QB': 14,
      'NYG_QB': 14,
      'BAL_RB': 12,
      'BUF_RB': 14,
      'KC_RB': 12,
      'MIA_RB': 12,
      'SF_RB': 12,
      'DET_RB': 12,
      'CIN_RB': 16,
      'DEN_RB': 20,
      'LV_RB': 20,
      'NE_RB': 20,
      'WAS_RB': 20,
      'CAR_RB': 20,
      'NYG_RB': 20,
      'BAL_WR': 15,
      'BUF_WR': 18,
      'KC_WR': 16,
      'MIA_WR': 16,
      'SF_WR': 16,
      'DET_WR': 16,
      'CIN_WR': 20,
      'DEN_WR': 24,
      'LV_WR': 24,
      'NE_WR': 24,
      'WAS_WR': 24,
      'CAR_WR': 24,
      'NYG_WR': 24,
      'BAL_TE': 10,
      'BUF_TE': 8,
      'KC_TE': 8,
      'MIA_TE': 8,
      'SF_TE': 8,
      'DET_TE': 8,
      'CIN_TE': 12,
      'DEN_TE': 16,
      'LV_TE': 16,
      'NE_TE': 16,
      'WAS_TE': 16,
      'CAR_TE': 16,
      'NYG_TE': 16
    };
  }

  public getInjuryStatus(playerName: string): string | undefined {
    return this.injuryData[playerName];
  }

  public getInjuryMultiplier(status: string): number {
    return INJURY_MULTIPLIERS[status] ?? 1.0;
  }

  public getSOSScore(team: string, position: string): { score: string; adjustment: number } {
    const key = `${team}_${position}`;
    const avgRank = this.sosData[key];
    
    if (!avgRank) {
      return { score: 'Medium', adjustment: 0 };
    }

    if (avgRank <= SOS_EASY_THRESHOLD) {
      return { score: 'Easy', adjustment: SOS_EASY_BONUS };
    } else if (avgRank >= SOS_HARD_THRESHOLD) {
      return { score: 'Hard', adjustment: -SOS_HARD_PENALTY };
    } else {
      return { score: 'Medium', adjustment: 0 };
    }
  }

  public async calculateTrend(env: Env, playerName: string, season: number): Promise<string> {
    // Get the last 3 weeks and season average for the player
    const query = `
      SELECT s.week, s.total_points
      FROM stats_custom_scored s
      JOIN players p ON p.player_id = s.player_id
      WHERE p.name = ? AND s.season = ?
      ORDER BY s.week DESC
      LIMIT 10
    `;

    const stats = await env.DB.prepare(query).bind(playerName, season).all();
    
    if (!stats.results || stats.results.length < 3) {
      return 'Neutral';
    }

    const allPoints = stats.results.map((row: any) => row.total_points);
    const recentPoints = allPoints.slice(0, 3); // Last 3 weeks
    const seasonAvg = allPoints.reduce((sum: number, points: number) => sum + points, 0) / allPoints.length;
    const recentAvg = recentPoints.reduce((sum: number, points: number) => sum + points, 0) / recentPoints.length;

    if (seasonAvg === 0) return 'Neutral';

    const difference = (recentAvg - seasonAvg) / seasonAvg;

    if (difference >= TREND_HOT_THRESHOLD) {
      return 'Hot';
    } else if (difference <= TREND_COLD_THRESHOLD) {
      return 'Cold';
    } else {
      return 'Neutral';
    }
  }

  public async enhanceProjection(
    env: Env,
    playerName: string,
    position: string,
    team: string,
    baseProjection: number,
    season: number,
    includeInjuries: boolean = true
  ): Promise<PlayerProjection> {
    let finalProjection = baseProjection;
    let injuryStatus: string | undefined;
    let injuryMultiplier: number | undefined;
    let sosScore: string | undefined;
    let sosAdjustment: number | undefined;
    let trend: string | undefined;

    // 1. Apply injury adjustment
    if (includeInjuries) {
      injuryStatus = this.getInjuryStatus(playerName);
      if (injuryStatus) {
        injuryMultiplier = this.getInjuryMultiplier(injuryStatus);
        finalProjection *= injuryMultiplier;
      }
    }

    // 2. Apply SOS adjustment
    const sos = this.getSOSScore(team, position);
    sosScore = sos.score;
    sosAdjustment = sos.adjustment;
    finalProjection *= (1 + sosAdjustment);

    // 3. Calculate trend (no numeric adjustment, just for display)
    trend = await this.calculateTrend(env, playerName, season);

    return {
      name: playerName,
      position,
      team,
      baseProjection,
      injuryStatus,
      injuryMultiplier,
      sosScore,
      sosAdjustment,
      trend,
      finalProjection
    };
  }
}

// Global instance
export const predictiveModeling = new PredictiveModeling(); 