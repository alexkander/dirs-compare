import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'data.db');
export const db = new Database(dbPath);

// Create the folders table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    absoluteRoute TEXT NOT NULL,
    lastSync TEXT
  );

  CREATE TABLE IF NOT EXISTS file_items (
    id TEXT PRIMARY KEY,
    relativeRoute TEXT NOT NULL,
    idFolder TEXT NOT NULL,
    checksum TEXT NOT NULL,
    lastSync TEXT NOT NULL,
    FOREIGN KEY (idFolder) REFERENCES folders (id) ON DELETE CASCADE
  );
`);
