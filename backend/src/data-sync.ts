import { decompressSync } from 'fflate';
import Papa from 'papaparse';
import { Env } from './db';
import { recalcPoints } from './recalcPoints';

interface FileConfig {
  season: number;
  name: string;
  url: string;
}

const FILES: FileConfig[] = [
  { 
    season: 2024, 
    name: 'stats_player_week_2024.csv.gz', 
    url: 'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2024.csv.gz' 
  },
  { 
    season: 2023, 
    name: 'stats_player_week_2023.csv.gz', 
    url: 'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2023.csv.gz' 
  }
];

export async function checkAndUpdateStats(env: Env, dryRun: boolean = false): Promise<{ updated: string[], skipped: string[], failed: string[] }> {
  const results = {
    updated: [] as string[],
    skipped: [] as string[],
    failed: [] as string[]
  };

  console.log(`🔄 Starting stats update check (dryRun: ${dryRun})...`);

  for (const file of FILES) {
    try {
      console.log(`📋 Checking ${file.name}...`);
      
      // Check current file status
      const headRes = await fetch(file.url, { method: 'HEAD' });
      
      if (!headRes.ok) {
        console.error(`❌ Failed to fetch headers for ${file.name}: ${headRes.status} ${headRes.statusText}`);
        results.failed.push(`${file.name} (HTTP ${headRes.status})`);
        continue;
      }

      const etag = headRes.headers.get('etag') || '';
      const lastModified = headRes.headers.get('last-modified') || '';

      if (dryRun) {
        console.log(`🔍 Dry run: Would check ${file.name} (ETag: ${etag}, Last-Modified: ${lastModified})`);
        results.skipped.push(file.name);
        continue;
      }

      // Check if we need to update
      const stored = await env.DB.prepare(
        'SELECT etag, last_modified FROM data_sync WHERE file_name = ?'
      ).bind(file.name).first();

      const isUpdated = !stored || stored.etag !== etag || stored.last_modified !== lastModified;

      if (isUpdated) {
        console.log(`🔄 Update detected for ${file.name}, downloading...`);
        
        // Download and process the file with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
        
        try {
          const dataRes = await fetch(file.url, { 
            signal: controller.signal 
          });
          
          if (!dataRes.ok) {
            console.error(`❌ Failed to download ${file.name}: ${dataRes.status} ${dataRes.statusText}`);
            results.failed.push(`${file.name} (Download failed)`);
            continue;
          }

          const arrayBuffer = await dataRes.arrayBuffer();
          const decompressed = decompressSync(new Uint8Array(arrayBuffer));
          const csvText = new TextDecoder().decode(decompressed);
        } finally {
          clearTimeout(timeoutId);
        }

        console.log(`📊 Parsing ${file.name}...`);
        const parsed = Papa.parse(csvText, { header: true });
        const rows = parsed.data as any[];

        if (rows.length === 0) {
          console.error(`❌ No data found in ${file.name}`);
          results.failed.push(`${file.name} (No data)`);
          continue;
        }

        console.log(`🗄️ Updating database for ${file.name} (${rows.length} rows)...`);
        
        // Remove existing season's data
        await env.DB.prepare('DELETE FROM stats_raw WHERE season = ?').bind(file.season).run();

        // Batch insert new data (100 rows per batch to reduce memory usage)
        const batchSize = 100;
        let processedCount = 0;
        
        for (let i = 0; i < rows.length; i += batchSize) {
          const batch = rows.slice(i, i + batchSize);
          
          // Use a single prepared statement for better performance
          const stmt = env.DB.prepare(`
            INSERT INTO stats_raw (
              season, week, player_id, passing_yards, passing_tds, interceptions,
              rushing_yards, rushing_tds, receptions, receiving_yards, receiving_tds,
              fumbles_lost, two_pt_conversions
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);

          const batchStmts = batch.map(row => {
            if (!row.player_id) return null;
            
            return stmt.bind(
              file.season,
              parseInt(row.week) || 0,
              row.player_id,
              parseInt(row.passing_yards) || 0,
              parseInt(row.passing_tds) || 0,
              parseInt(row.interceptions) || 0,
              parseInt(row.rushing_yards) || 0,
              parseInt(row.rushing_tds) || 0,
              parseInt(row.receptions) || 0,
              parseInt(row.receiving_yards) || 0,
              parseInt(row.receiving_tds) || 0,
              parseInt(row.fumbles_lost) || 0,
              parseInt(row.two_pt_conversions) || 0
            );
          }).filter(Boolean);

          if (batchStmts.length > 0) {
            await env.DB.batch(batchStmts as any[]);
            processedCount += batchStmts.length;
            
            // Log progress every 1000 rows
            if (processedCount % 1000 === 0) {
              console.log(`📈 Processed ${processedCount} of ${rows.length} rows...`);
            }
          }
        }

        // Update sync table
        await env.DB.prepare(
          `INSERT OR REPLACE INTO data_sync (file_name, etag, last_modified, last_updated) 
           VALUES (?, ?, ?, CURRENT_TIMESTAMP)`
        ).bind(file.name, etag, lastModified).run();

        console.log(`✅ ${file.name} updated successfully (${processedCount} rows processed).`);
        results.updated.push(file.name);

        // Trigger points recalculation for this season
        console.log(`🧮 Recalculating points for season ${file.season}...`);
        await recalcPoints(env);
        console.log(`✅ Points recalculation complete for season ${file.season}.`);

      } else {
        console.log(`⏩ ${file.name} is up to date, no changes.`);
        results.skipped.push(file.name);
      }

    } catch (error) {
      console.error(`❌ Error processing ${file.name}:`, error);
      results.failed.push(`${file.name} (${error instanceof Error ? error.message : 'Unknown error'})`);
    }
  }

  console.log(`📊 Update check complete. Updated: ${results.updated.length}, Skipped: ${results.skipped.length}, Failed: ${results.failed.length}`);
  return results;
} 