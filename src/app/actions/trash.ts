'server';

import { getSettings } from '@/lib/settingsStore';
import { getFolderById, deleteFolder } from '@/lib/folderStore';
import { deleteFileItemsByFolderId } from '@/lib/fileItemStore';
import fs from 'fs/promises';
import path from 'path';
import { TrashedFolder } from '@/lib/trashStore';

export async function moveFolderToTrash(folderId: string) {
  try {
    // Get folder and settings
    const folder = await getFolderById(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    const settings = getSettings();
    const trashDir = settings.trashDirectory || './.trash';

    // Create trash directory if it doesn't exist
    await fs.mkdir(trashDir, { recursive: true });

    // Create a subdirectory in trash with the folder ID
    const trashFolderPath = path.join(trashDir, folderId);
    await fs.mkdir(trashFolderPath, { recursive: true });

    // Get the folder name from the absolute route
    const folderName = path.basename(folder.absoluteRoute);
    const destinationPath = path.join(trashFolderPath, folderName);

    // Move the folder to trash
    await fs.rename(folder.absoluteRoute, destinationPath);

    // Create metadata with the original path and deletion info
    const deletedFolderData: TrashedFolder = {
      ...folder,
      name: folderName,
      excludePatterns: JSON.stringify(folder.excludePatterns || []),
      lastSync: folder.lastSync?.toISOString() || null,
      deletedAt: new Date().toISOString()
    };

    // Save folder metadata to a JSON file in the trash folder
    const metadataPath = path.join(trashFolderPath, 'folder.json');
    await fs.writeFile(
      metadataPath,
      JSON.stringify(deletedFolderData, null, 2),
      'utf-8'
    );
    
    // Update the folder's absoluteRoute to point to the trash location
    folder.absoluteRoute = destinationPath;

    // Delete file items associated with this folder
    await deleteFileItemsByFolderId(folderId);
    
    // Delete the folder from the database
    await deleteFolder(folderId);

    return { success: true };
  } catch (error) {
    console.error('Error moving folder to trash:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to move folder to trash' 
    };
  }
}
