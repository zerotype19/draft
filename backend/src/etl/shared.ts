import { Env } from "../db";
import Papa from "papaparse";
import { gunzipSync } from "fflate";

/**
 * Downloads, parses, and inserts stats from NFLverse CSV.gz file
 */
export async function importSeason(env: Env, season: number, url: string) {
  console.log(`Starting import for ${season}...`);

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch CSV: ${res.statusText}`);

  const compressedData = await res.arrayBuffer();
  const decompressedData = gunzipSync(new Uint8Array(compressedData));
  const text = new TextDecoder().decode(decompressedData);

  let batch: any[] = [];
  let lineCount = 0;

  return new Promise<void>((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      step: async (row: any) => {
        try {
          const data = row.data;
          lineCount++;

          // Insert player if not exists
          await env.DB.prepare(
            `INSERT OR IGNORE INTO players (player_id, name, position, team) VALUES (?, ?, ?, ?)`
          )
            .bind(data.player_id, data.player_name, data.position, data.recent_team)
            .run();

          // Add to batch
          batch.push([
            season,
            data.week,
            data.player_id,
            data.passing_yards || 0,
            data.passing_tds || 0,
            data.interceptions || 0,
            data.rushing_yards || 0,
            data.rushing_tds || 0,
            data.receptions || 0,
            data.receiving_yards || 0,
            data.receiving_tds || 0,
            data.fumbles_lost || 0,
            data.two_point_conversions || 0
          ]);

          if (batch.length >= 500) {
            await insertBatch(env, batch);
            batch = [];
          }
        } catch (error) {
          console.error(`Error parsing row ${lineCount} for season ${season}:`, error);
          reject(error);
        }
      },
      complete: async () => {
        try {
          if (batch.length) {
            await insertBatch(env, batch);
          }
          console.log(`Imported ${lineCount} rows for ${season}`);
          resolve();
        } catch (error) {
          console.error(`Error completing import for season ${season}:`, error);
          reject(error);
        }
      },
      error: (err: any) => {
        console.error(`CSV parse error for season ${season}:`, err);
        reject(err);
      }
    });
  });
}

async function insertBatch(env: Env, batch: any[]) {
  const placeholders = batch.map(() => "(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").join(",");
  const flat = batch.flat();
  await env.DB.prepare(
    `INSERT INTO stats_raw (
      season, week, player_id,
      passing_yards, passing_tds, interceptions,
      rushing_yards, rushing_tds, receptions,
      receiving_yards, receiving_tds, fumbles_lost,
      two_pt_conversions
    ) VALUES ${placeholders}`
  ).bind(...flat).run();
} 