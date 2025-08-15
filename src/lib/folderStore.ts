
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';

export interface Folder {
  id: string;
  absoluteRoute: string;
  lastSync: Date | null;
  excludePatterns: string[];
  totalBytes: number | null;
  countFiles: number | null;
}

// Type for raw folder data from the database
interface RawFolder {
  id: string;
  absoluteRoute: string;
  lastSync: string | null;
  excludePatterns: string;
  totalBytes: number | null;
  countFiles: number | null;
}

export function addFolder(absoluteRoute: string): void {
  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO folders (id, absoluteRoute, excludePatterns, totalBytes, countFiles) VALUES (?, ?, ?, ?, ?)');
  stmt.run(id, absoluteRoute, '[]', 0, 0);
}

export function getFolders(): Folder[] {
  const stmt = db.prepare('SELECT * FROM folders ORDER BY absoluteRoute ASC');
  const rawFolders = stmt.all() as RawFolder[];
  return rawFolders.map(folder => ({
    ...folder,
    excludePatterns: JSON.parse(folder.excludePatterns || '[]'),
    lastSync: folder.lastSync ? new Date(folder.lastSync) : null,
    totalBytes: folder.totalBytes ?? 0,
    countFiles: folder.countFiles ?? 0,
  }));
}

export function getFolderById(id: string): Folder | null {
  const stmt = db.prepare('SELECT * FROM folders WHERE id = ?');
  const row = stmt.get(id) as RawFolder | undefined;
  if (!row) return null;

  return {
    ...row,
    id: row.id!,
    absoluteRoute: row.absoluteRoute!,
    excludePatterns: JSON.parse(row.excludePatterns || '[]'),
    lastSync: row.lastSync ? new Date(row.lastSync) : null,
    totalBytes: row.totalBytes ?? 0,
    countFiles: row.countFiles ?? 0,
  };
}

export function updateFolder(updatedFolder: Folder): void {
  const stmt = db.prepare(
    'UPDATE folders SET lastSync = ?, totalBytes = ?, countFiles = ?, excludePatterns = ? WHERE id = ?'
  );
  const lastSyncValue = updatedFolder.lastSync instanceof Date ? updatedFolder.lastSync.toISOString() : null;
  const info = stmt.run(
    lastSyncValue,
    updatedFolder.totalBytes,
    updatedFolder.countFiles,
    JSON.stringify(updatedFolder.excludePatterns),
    updatedFolder.id
  );

  if (info.changes === 0) {
    throw new Error(`Folder with id ${updatedFolder.id} not found.`);
  }
}

export function removeFolder(id: string): void {
  const stmt = db.prepare('DELETE FROM folders WHERE id = ?');
  const info = stmt.run(id);
  if (info.changes === 0) {
    throw new Error(`Folder with id ${id} not found.`);
  }
}
