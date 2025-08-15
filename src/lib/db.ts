import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data.db');
export const db = new Database(dbPath);

// Create the folders table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    absoluteRoute TEXT NOT NULL,
    lastSync TEXT
  )
`);
