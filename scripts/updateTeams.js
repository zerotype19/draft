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

async function updateTeams(season, url) {
  console.log(`\n=== Starting team updates for ${season} ===`);
  
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
    
    // Generate UPDATE statements
    console.log(`Generating team UPDATE statements for ${season}...`);
    const updateStatements = [];
    const processedPlayers = new Set();
    
    for (const row of parsed.data) {
      // Validate required fields
      if (!row.player_id || !row.player_name) {
        continue;
      }
      
      // Skip if we've already processed this player
      if (processedPlayers.has(row.player_id)) {
        continue;
      }
      
      // Improved team extraction logic
      const teamAbbrev = 
        row.recent_team?.trim() || 
        row.team?.trim() || 
        row.posteam?.trim() || 
        'FA';
      
      // Validate team abbreviation (should be 2-3 letters)
      const validTeam = /^[A-Z]{2,3}$/.test(teamAbbrev) ? teamAbbrev : 'FA';
      
      // Only update if we have a valid team (not FA)
      if (validTeam !== 'FA') {
        // Escape single quotes in player names
        const escapedName = row.player_name.replace(/'/g, "''");
        
        updateStatements.push(
          `UPDATE players SET team = '${validTeam}' WHERE player_id = '${row.player_id}' AND name = '${escapedName}';`
        );
        
        processedPlayers.add(row.player_id);
      }
    }
    
    // Write SQL file
    const sqlDir = path.join(__dirname, 'sql');
    if (!fs.existsSync(sqlDir)) {
      fs.mkdirSync(sqlDir, { recursive: true });
    }
    const sqlFile = path.join(sqlDir, `update_teams_${season}.sql`);
    fs.writeFileSync(sqlFile, updateStatements.join('\n'));
    console.log(`SQL file created: ${sqlFile} (${updateStatements.length} statements)`);
    
    // Execute SQL against D1
    if (updateStatements.length > 0) {
      console.log(`Executing team updates for ${season}...`);
      execSync(`wrangler d1 execute draft-db --remote --file=${sqlFile}`, { 
        stdio: 'inherit',
        cwd: path.join(__dirname, '..', 'backend') // Run from backend directory where wrangler.toml is
      });
    } else {
      console.log(`No team updates needed for ${season}`);
    }
    
    console.log(`✅ Team updates complete for ${season} (${updateStatements.length} updates)`);
    
  } catch (error) {
    console.error(`❌ Team updates failed for ${season}:`, error.message);
    throw error;
  }
}

async function main() {
  console.log('🚀 Starting NFLverse team data updates...');
  console.log('This script will update existing players with proper team data from the CSV files.\n');
  
  try {
    // Update teams for both seasons
    await updateTeams(
      2023, 
      'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2023.csv.gz'
    );
    
    await updateTeams(
      2024, 
      'https://github.com/nflverse/nflverse-data/releases/download/stats_player/stats_player_week_2024.csv.gz'
    );
    
    console.log('\n🎉 All team updates completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('   1. Test the rankings endpoint to see updated team data');
    console.log('   2. Check that players now show proper team abbreviations');
    
  } catch (error) {
    console.error('\n💥 Team updates failed:', error.message);
    process.exit(1);
  }
}

// Run the team updates
main(); 