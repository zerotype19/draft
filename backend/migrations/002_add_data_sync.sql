-- Data sync tracking table
CREATE TABLE IF NOT EXISTS data_sync (
  file_name TEXT PRIMARY KEY,
  etag TEXT,
  last_modified TEXT,
  last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
); 