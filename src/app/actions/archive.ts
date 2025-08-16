'server';

import { getSettings } from '@/lib/settingsStore';
import { getFolderById, deleteFolder } from '@/lib/folderStore';
import { deleteFileItemsByFolderId } from '@/lib/fileItemStore';
import fs from 'fs/promises';
import path from 'path';
import { ArchivedFolder } from '@/lib/archiveStore';

export async function moveFolderToArchive(folderId: string) {
  try {
    // Get folder and settings
    const folder = await getFolderById(folderId);
    if (!folder) {
      throw new Error('Folder not found');
    }

    const settings = getSettings();
    const archiveDir = settings.archivedProjectsPath || './.archive';

    // Create archive directory if it doesn't exist
    await fs.mkdir(archiveDir, { recursive: true });

    // Create a subdirectory in archive with the folder ID
    const archiveFolderPath = path.join(archiveDir, folderId);
    await fs.mkdir(archiveFolderPath, { recursive: true });

    // Get the folder name from the absolute route
    const folderName = path.basename(folder.absoluteRoute);
    const destinationPath = path.join(archiveFolderPath, folderName);

    // Save the original path before moving
    const originalAbsoluteRoute = folder.absoluteRoute;
    
    // Move the folder to archive
    await fs.rename(originalAbsoluteRoute, destinationPath);

    // Create metadata with the original path and archive info
    const archivedFolderData: ArchivedFolder = {
      ...folder,
      name: folderName,
      excludePatterns: JSON.stringify(folder.excludePatterns || []),
      lastSync: folder.lastSync?.toISOString() || null,
      archivedAt: new Date().toISOString()
    };

    // Save folder metadata to a JSON file in the archive folder
    const metadataPath = path.join(archiveFolderPath, 'folder.json');
    await fs.writeFile(
      metadataPath,
      JSON.stringify(archivedFolderData, null, 2),
      'utf-8'
    );
    
    // Delete file items associated with this folder
    await deleteFileItemsByFolderId(folderId);
    
    // Delete the folder from the database
    await deleteFolder(folderId);

    return { success: true };
  } catch (error) {
    console.error('Error moving folder to archive:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to move folder to archive' 
    };
  }
}
