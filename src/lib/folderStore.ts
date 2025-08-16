
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';

export interface Folder {
  checksum: string | null;
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
  excludePatterns: string | null;
  totalBytes: number | null;
  countFiles: number | null;
  checksum: string | null;
}

export function addFolder(absoluteRoute: string): void {
  const id = uuidv4();
  const stmt = db.prepare('INSERT INTO folders (id, absoluteRoute, excludePatterns, totalBytes, countFiles, checksum) VALUES (?, ?, ?, ?, ?, ?)');
  stmt.run(id, absoluteRoute, '[]', null, null, null);
}

export function getFolders(): Folder[] {
  const stmt = db.prepare('SELECT * FROM folders ORDER BY absoluteRoute ASC');
  const rawFolders = stmt.all() as RawFolder[];
  return rawFolders.map(folder => ({
    ...folder,
    checksum: folder.checksum ?? null,
    excludePatterns: JSON.parse(folder.excludePatterns || '[]'),
    lastSync: folder.lastSync ? new Date(folder.lastSync) : null,
    totalBytes: folder.totalBytes,
    countFiles: folder.countFiles,
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
    checksum: row.checksum ?? null,
    excludePatterns: JSON.parse(row.excludePatterns || '[]'),
    lastSync: row.lastSync ? new Date(row.lastSync) : null,
    totalBytes: row.totalBytes,
    countFiles: row.countFiles,
  };
}

export function updateFolder(updatedFolder: Folder): void {
  const stmt = db.prepare(
    'UPDATE folders SET lastSync = ?, totalBytes = ?, countFiles = ?, excludePatterns = ?, checksum = ? WHERE id = ?'
  );
  const lastSyncValue = updatedFolder.lastSync instanceof Date ? updatedFolder.lastSync.toISOString() : null;
  const info = stmt.run(
    lastSyncValue,
    updatedFolder.totalBytes,
    updatedFolder.countFiles,
    JSON.stringify(updatedFolder.excludePatterns),
    updatedFolder.checksum,
    updatedFolder.id
  );

  if (info.changes === 0) {
    throw new Error(`Folder with id ${updatedFolder.id} not found.`);
  }
}

export function updateFolderChecksum(id: string, checksum: string): void {
  const stmt = db.prepare('UPDATE folders SET checksum = ? WHERE id = ?');
  stmt.run(checksum, id);
}

export function deleteFolder(id: string): void {
  const stmt = db.prepare('DELETE FROM folders WHERE id = ?');
  const info = stmt.run(id);
  if (info.changes === 0) {
    throw new Error(`Folder with id ${id} not found.`);
  }
}
