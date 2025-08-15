import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import micromatch from 'micromatch';
import { getFolders, updateFolder, Folder } from './folderStore';
import { getFileItemsByFolder, addFileItem, updateFileItem, removeFileItem, FileItem } from './fileItemStore';
import { getSettings } from './settingsStore';
import { calculateFolderChecksum } from './checksum';

// Helper function to calculate checksum
function calculateChecksum(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

// Helper function to scan files recursively
function scanDirectory(directory: string, baseDirectory: string, excludePatterns: string[]): Map<string, { fullPath: string; size: number }> {
  const files = new Map<string, { fullPath: string; size: number }>();
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    // Ensure consistent path separators (Unix-style) for matching
    const relativeRoute = path.relative(baseDirectory, fullPath).replace(/\\/g, '/');

    if (micromatch.isMatch(relativeRoute, excludePatterns)) {
      continue;
    }

    if (entry.isDirectory()) {
      const subFiles = scanDirectory(fullPath, baseDirectory, excludePatterns);
      subFiles.forEach((value, key) => files.set(key, value));
    } else if (entry.isFile()) {
      try {
        const stats = fs.statSync(fullPath);
        files.set(relativeRoute, { fullPath, size: stats.size });
      } catch (error) {
        console.error(`Could not stat file ${fullPath}:`, error);
      }
    }
  }
  return files;
}

export async function syncFolder(folderId: string): Promise<void> {
  const folders = await getFolders();
  const folder = folders.find(f => f.id === folderId);
  if (!folder) throw new Error(`Folder with ID ${folderId} not found.`);

  const settings = getSettings();
  const excludePatterns = [...settings.globalExcludePatterns, ...(folder.excludePatterns || [])];

  const scannedFiles = scanDirectory(folder.absoluteRoute, folder.absoluteRoute, excludePatterns);
  const existingFileItems = new Map(getFileItemsByFolder(folderId).map(item => [item.relativeRoute, item]));

  let totalBytes = 0;
  const processedRoutes = new Set<string>();

  for (const [relativeRoute, fileData] of scannedFiles.entries()) {
    const checksum = calculateChecksum(fileData.fullPath);
    const existingItem = existingFileItems.get(relativeRoute);

    if (existingItem) {
      if (existingItem.checksum !== checksum || existingItem.sizeBytes !== fileData.size) {
        const updatedItem: FileItem = { ...existingItem, checksum, sizeBytes: fileData.size, lastSync: new Date() };
        updateFileItem(updatedItem);
      }
    } else {
      addFileItem({ relativeRoute, idFolder: folderId, checksum, sizeBytes: fileData.size });
    }
    totalBytes += fileData.size;
    processedRoutes.add(relativeRoute);
  }

  for (const [relativeRoute, item] of existingFileItems.entries()) {
    if (!processedRoutes.has(relativeRoute)) {
      removeFileItem(item.id);
    }
  }

  const checksum = calculateFolderChecksum(folderId);

  const updatedFolder: Folder = {
    ...folder,
    totalBytes,
    countFiles: scannedFiles.size,
    lastSync: new Date(),
    checksum,
  };
  updateFolder(updatedFolder);
}
