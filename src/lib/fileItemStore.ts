import { v4 as uuidv4 } from 'uuid';
import { db } from './db';

export interface FileItem {
  id: string;
  relativeRoute: string;
  idFolder: string;
  checksum: string;
  lastSync: Date;
}

interface RawFileItem {
  id: string;
  relativeRoute: string;
  idFolder: string;
  checksum: string;
  lastSync: string;
}

export function getFileItemsByFolder(idFolder: string): FileItem[] {
  const stmt = db.prepare('SELECT * FROM file_items WHERE idFolder = ?');
  const rawItems = stmt.all(idFolder) as RawFileItem[];
  return rawItems.map(item => ({
    ...item,
    lastSync: new Date(item.lastSync),
  }));
}

export function addFileItem(item: Omit<FileItem, 'id' | 'lastSync'>): FileItem {
  const newItem: FileItem = {
    ...item,
    id: uuidv4(),
    lastSync: new Date(),
  };

  const stmt = db.prepare(
    'INSERT INTO file_items (id, relativeRoute, idFolder, checksum, lastSync) VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(newItem.id, newItem.relativeRoute, newItem.idFolder, newItem.checksum, newItem.lastSync.toISOString());
  return newItem;
}

export function updateFileItem(item: FileItem): void {
  const stmt = db.prepare(
    'UPDATE file_items SET relativeRoute = ?, checksum = ?, lastSync = ? WHERE id = ?'
  );
  const info = stmt.run(item.relativeRoute, item.checksum, item.lastSync.toISOString(), item.id);

  if (info.changes === 0) {
    throw new Error(`FileItem with id ${item.id} not found.`);
  }
}

export function removeFileItem(id: string): void {
  const stmt = db.prepare('DELETE FROM file_items WHERE id = ?');
  const info = stmt.run(id);

  if (info.changes === 0) {
    throw new Error(`FileItem with id ${id} not found.`);
  }
}
