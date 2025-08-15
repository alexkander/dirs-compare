import { v4 as uuidv4 } from 'uuid';
import { db } from './db';

export interface Folder {
  id: string;
  absoluteRoute: string;
  lastSync: Date | null;
}

// Type for raw folder data from the database
interface RawFolder {
  id: string;
  absoluteRoute: string;
  lastSync: string | null;
}

export async function getFolders(): Promise<Folder[]> {
  const stmt = db.prepare('SELECT * FROM folders');
  const rawFolders = stmt.all() as RawFolder[];
  return rawFolders.map(folder => ({
    ...folder,
    lastSync: folder.lastSync ? new Date(folder.lastSync) : null,
  }));
}

export async function addFolder(absoluteRoute: string): Promise<Folder> {
  const newFolder: Folder = {
    id: uuidv4(),
    absoluteRoute,
    lastSync: null,
  };

  const stmt = db.prepare('INSERT INTO folders (id, absoluteRoute, lastSync) VALUES (?, ?, ?)');
  stmt.run(newFolder.id, newFolder.absoluteRoute, newFolder.lastSync);
  return newFolder;
}

export async function updateFolder(updatedFolder: Folder): Promise<void> {
  const stmt = db.prepare('UPDATE folders SET absoluteRoute = ?, lastSync = ? WHERE id = ?');
  const lastSyncValue = updatedFolder.lastSync instanceof Date ? updatedFolder.lastSync.toISOString() : null;
  const info = stmt.run(updatedFolder.absoluteRoute, lastSyncValue, updatedFolder.id);

  if (info.changes === 0) {
    throw new Error(`Folder with id ${updatedFolder.id} not found.`);
  }
}

export async function removeFolder(id: string): Promise<void> {
  const stmt = db.prepare('DELETE FROM folders WHERE id = ?');
  const info = stmt.run(id);

  if (info.changes === 0) {
    throw new Error(`Folder with id ${id} not found.`);
  }
}
