import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'data.db');
export const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS folders (
    id TEXT PRIMARY KEY,
    absoluteRoute TEXT NOT NULL,
    lastSync TEXT,
    excludePatterns TEXT NOT NULL DEFAULT '[]',
    totalBytes INTEGER,
    countFiles INTEGER
  );

  CREATE TABLE IF NOT EXISTS file_items (
    id TEXT PRIMARY KEY,
    relativeRoute TEXT NOT NULL,
    idFolder TEXT NOT NULL,
    checksum TEXT NOT NULL,
    lastSync TEXT NOT NULL,
    FOREIGN KEY (idFolder) REFERENCES folders (id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    globalExcludePatterns TEXT NOT NULL
  );
`);

// Migration for settings table: rename excludedPatterns to globalExcludePatterns
try {
  db.exec('ALTER TABLE settings RENAME COLUMN excludedPatterns TO globalExcludePatterns');
} catch (error) {
  // Ignore error if column doesn't exist or is already renamed
}

// Add excludePatterns, totalBytes and countFiles columns to folders table if they don't exist (for existing databases)
interface ColumnInfo {
  name: string;
}
const tableInfo = db.prepare(`PRAGMA table_info(folders)`).all() as ColumnInfo[];
const columns = tableInfo;

if (!columns.some(c => c.name === 'excludePatterns')) {
  db.exec('ALTER TABLE folders ADD COLUMN excludePatterns TEXT NOT NULL DEFAULT \'[]\'');
}

if (!columns.some(c => c.name === 'totalBytes')) {
  db.exec('ALTER TABLE folders ADD COLUMN totalBytes INTEGER');
}

if (!columns.some(c => c.name === 'countFiles')) {
  db.exec('ALTER TABLE folders ADD COLUMN countFiles INTEGER');
}
