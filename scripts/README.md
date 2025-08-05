# Import Scripts

This folder contains local scripts for importing NFLverse data into the D1 database.

## Import Local Data

Run the import script to download and import 2023 and 2024 NFLverse data:

```bash
npm run import
```

Or directly:

```bash
node importLocal.js
```

## What it does:

1. Downloads NFLverse CSV.gz files for 2023 and 2024 seasons
2. Decompresses and parses the CSV data
3. Generates SQL files in `/scripts/sql/` for debugging
4. Executes the SQL against your remote D1 database
5. Imports both players and stats data

## Requirements:

- Node.js installed
- Wrangler CLI installed globally
- Access to your Cloudflare D1 database

## Files:

- `importLocal.js` - Main import script
- `sql/` - Generated SQL files (for debugging)
- `package.json` - Dependencies (node-fetch, papaparse)

## After Import:

1. Insert scoring settings into D1
2. Run the recalc-points endpoint
3. Test the rankings endpoint 