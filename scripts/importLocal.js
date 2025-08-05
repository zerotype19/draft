import fs from 'fs';
import fetch from 'node-fetch';
import zlib from 'zlib';
import Papa from 'papaparse';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importSeason(season, url) {
  console.log(`\n=== Starting import for ${season} ===`);
  
  try {
    // Download CSV.gz file
    console.log(`Downloading CSV for ${season}...`);
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to fetch CSV for ${season}: ${res.status} ${res.statusText}`);
    }
    
    const buffer = await res.buffer();
    console.log(`Downloaded ${buffer.length} bytes for ${season}`);
    
    // Decompress
    console.log(`Decompressing CSV for ${season}...`);
    const decompressed = zlib.gunzipSync(buffer);
    const csvText = decompressed.toString();
    console.log(`Decompressed to ${csvText.length} characters for ${season}`);
    
    // Parse CSV
    console.log(`Parsing CSV for ${season}...`);
    const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });
    console.log(`Parsed ${parsed.data.length} rows for ${season}`);
    
    // Generate SQL statements
    console.log(`Generating SQL file for ${season}...`);
    const insertStatements = [];
    
    for (const row of parsed.data) {
      // Validate required fields
      if (!row.player_id || !row.player_name) {
        console.warn(`Skipping row with missing player_id or player_name in ${season}`);
        continue;
      }
      
      // Escape single quotes in player names
      const escapedName = row.player_name.replace(/'/g, "''");
      
      // Players insert (IGNORE to avoid duplicates)
      insertStatements.push(
        `INSERT OR IGNORE INTO players (player_id, name, position, team)
         VALUES ('${row.player_id}', '${escapedName}', '${row.position || ''}', '${row.recent_team || ''}');`
      );

      // Stats insert
      insertStatements.push(
        `INSERT INTO stats_raw (season, week, player_id, passing_yards, passing_tds, interceptions, rushing_yards, rushing_tds, receptions, receiving_yards, receiving_tds, fumbles_lost, two_pt_conversions)
         VALUES (${season}, ${row.week || 0}, '${row.player_id}', ${row.passing_yards || 0}, ${row.passing_tds || 0}, ${row.interceptions || 0}, ${row.rushing_yards || 0}, ${row.rushing_tds || 0}, ${row.receptions || 0}, ${row.receiving_yards || 0}, ${row.receiving_tds || 0}, ${row.fumbles_lost || 0}, ${row.two_point_conversions || 0});`
      );
    }
    
    // Write SQL file
    const sqlDir = path.join(__dirname, 'sql');
    const sqlFile = path.join(sqlDir, `import_${season}.sql`);
    fs.writeFileSync(sqlFile, insertStatements.join('\n'));
    console.log(`SQL file created: ${sqlFile} (${insertStatements.length} statements)`);
    
    // Execute SQL against D1
    console.log(`Executing SQL import for ${season}...`);
    execSync(`wrangler d1 execute draft-db --remote --file=${sqlFile}`, { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..', 'backend') // Run from backend directory where wrangler.toml is
    });
    
    console.log(`✅ Import complete for ${season} (${parsed.data.length} rows)`);
    
  } catch (error) {
    console.error(`❌ Import failed for ${season}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting NFLverse data import...');
  console.log('This script will download and import 2023 and 2024 season data into your D1 database.');
  console.log('SQL files will be saved in /scripts/sql/ for debugging purposes.\n');
  
  try {
    // Import 2023 first, then 2024
    await importSeason(
      2023, 
      'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2023.csv.gz'
    );
    
    await importSeason(
      2024, 
      'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2024.csv.gz'
    );
    
    console.log('\n🎉 All imports completed successfully!');
    console.log('\n📁 SQL files are saved in /scripts/sql/ for debugging.');
    console.log('   You can delete them manually if desired.');
    console.log('\n📊 Next steps:');
    console.log('   1. Insert scoring settings into D1');
    console.log('   2. Run recalc-points endpoint');
    console.log('   3. Test rankings endpoint');
    
  } catch (error) {
    console.error('\n💥 Import failed:', error.message);
    process.exit(1);
  }
}

// Run the import
main(); 