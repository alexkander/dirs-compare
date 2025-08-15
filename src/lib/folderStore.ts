import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

const foldersFilePath = path.join(process.cwd(), 'folders.json');

export interface Folder {
  id: string;
  route: string;
  lastSync: Date | null;
}

interface FolderData {
  folders: Folder[];
}

async function readFolders(): Promise<Folder[]> {
  try {
    const data = await fs.readFile(foldersFilePath, 'utf-8');
    const jsonData: FolderData = JSON.parse(data);
    if (jsonData.folders) {
        return jsonData.folders.map(folder => ({
            ...folder,
            lastSync: folder.lastSync ? new Date(folder.lastSync) : null
        }));
    }
    return [];
  } catch (error) {
    if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

async function saveFolders(folders: Folder[]): Promise<void> {
  const data: FolderData = { folders };
  await fs.writeFile(foldersFilePath, JSON.stringify(data, null, 2), 'utf-8');
}

export async function addFolder(route: string): Promise<Folder> {
    const folders = await readFolders();
    const newFolder: Folder = {
        id: uuidv4(),
        route,
        lastSync: null
    };
    folders.push(newFolder);
    await saveFolders(folders);
    return newFolder;
}

export async function getFolders(): Promise<Folder[]> {
    return readFolders();
}

export async function updateFolder(updatedFolder: Folder): Promise<void> {
    const folders = await readFolders();
    const index = folders.findIndex(f => f.id === updatedFolder.id);
    if (index !== -1) {
        folders[index] = updatedFolder;
        await saveFolders(folders);
    } else {
        throw new Error(`Folder with id ${updatedFolder.id} not found.`);
    }
}

export async function removeFolder(id: string): Promise<void> {
    const folders = await readFolders();
    const filteredFolders = folders.filter(f => f.id !== id);
    if (folders.length === filteredFolders.length) {
        throw new Error(`Folder with id ${id} not found.`);
    }
    await saveFolders(filteredFolders);
}
