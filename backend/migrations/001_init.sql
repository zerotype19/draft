-- Players table
CREATE TABLE players (
    player_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    position TEXT,
    team TEXT
);

-- Raw stats from CSV
CREATE TABLE stats_raw (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season INTEGER,
    week INTEGER,
    player_id TEXT,
    passing_yards INTEGER DEFAULT 0,
    passing_tds INTEGER DEFAULT 0,
    interceptions INTEGER DEFAULT 0,
    rushing_yards INTEGER DEFAULT 0,
    rushing_tds INTEGER DEFAULT 0,
    receptions INTEGER DEFAULT 0,
    receiving_yards INTEGER DEFAULT 0,
    receiving_tds INTEGER DEFAULT 0,
    fumbles_lost INTEGER DEFAULT 0,
    two_pt_conversions INTEGER DEFAULT 0,
    FOREIGN KEY (player_id) REFERENCES players(player_id)
);

-- Scoring settings (single-user)
CREATE TABLE scoring_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    passing_yards_points REAL DEFAULT 0.04,
    passing_td_points REAL DEFAULT 4,
    interception_points REAL DEFAULT -2,
    rushing_yards_points REAL DEFAULT 0.1,
    rushing_td_points REAL DEFAULT 6,
    reception_points REAL DEFAULT 1,
    receiving_yards_points REAL DEFAULT 0.1,
    receiving_td_points REAL DEFAULT 6,
    fumble_lost_points REAL DEFAULT -2,
    two_pt_conversion_points REAL DEFAULT 2
);

-- Custom scored totals
CREATE TABLE stats_custom_scored (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    season INTEGER,
    week INTEGER,
    player_id TEXT,
    total_points REAL,
    FOREIGN KEY (player_id) REFERENCES players(player_id)
); 