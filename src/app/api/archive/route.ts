import { NextResponse } from 'next/server';
import { getSettings } from '@/lib/settingsStore';
import { addFolder, Folder } from '@/lib/folderStore';
import { moveFolderToArchive } from '@/app/actions/archive';
import fs from 'fs/promises';
import path from 'path';
import { ArchivedFolder } from '@/lib/archiveStore';

// POST /api/archive - Move folder to archive
export async function POST(request: Request) {
  try {
    const { folderId } = await request.json();
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    const result = await moveFolderToArchive(folderId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to move folder to archive' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in move to archive API:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/archive - Get all archived folders
export async function GET() {
  try {
    const settings = getSettings();
    const archiveDir = settings.archivedProjectsPath || './.archive';
    
    // Check if archive directory exists
    try {
      await fs.access(archiveDir);
    } catch (error) {
      // If directory doesn't exist, return empty array
      return NextResponse.json([]);
    }
    
    // Read all subdirectories in the archive directory
    const entries = await fs.readdir(archiveDir, { withFileTypes: true });
    const folderEntries = entries.filter(entry => entry.isDirectory());
    
    const folders: ArchivedFolder[] = [];
    
    // Process each folder
    for (const entry of folderEntries) {
      try {
        const folderPath = path.join(archiveDir, entry.name);
        const folderJsonPath = path.join(folderPath, 'folder.json');
        
        // Read the folder.json file
        const folderData: ArchivedFolder = JSON.parse(await fs.readFile(folderJsonPath, 'utf-8'));
        
        folders.push(folderData);
      } catch (err) {
        console.error(`Error processing archived folder ${entry.name}:`, err);
        // Skip this folder but continue with others
      }
    }
    
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error getting archived folders:', error);
    return NextResponse.json(
      { error: 'Failed to get archived folders' },
      { status: 500 }
    );
  }
}

// PATCH /api/archive - Restore a folder from archive
export async function PATCH(request: Request) {
  try {
    const { folderId } = await request.json();
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    const settings = getSettings();
    const archiveDir = settings.archivedProjectsPath || './.archive';
    const archiveFolderPath = path.join(archiveDir, folderId);
    
    // Check if the folder exists in archive
    try {
      await fs.access(archiveFolderPath);
    } catch (error) {
      return NextResponse.json(
        { error: 'Archived folder not found' },
        { status: 404 }
      );
    }
    
    // Read the folder metadata
    const metadataPath = path.join(archiveFolderPath, 'folder.json');
    const folderData: ArchivedFolder = JSON.parse(await fs.readFile(metadataPath, 'utf-8'));
    
    // Get the actual folder name (it's a subdirectory inside the archive folder)
    const folderEntry = path.basename(folderData.absoluteRoute);
    
    if (!folderEntry) {
      throw new Error('Could not find the archived folder contents');
    }
    
    const archivedFolderPath = path.join(archiveFolderPath, folderEntry);
    
    if (!folderData.absoluteRoute) {
      throw new Error('Original path not found in archive metadata');
    }
    
    // Create parent directory if it doesn't exist
    await fs.mkdir(path.dirname(folderData.absoluteRoute), { recursive: true });
    
    // Move the folder back to its original location
    await fs.rename(archivedFolderPath, folderData.absoluteRoute);
    
    // Remove the archive directory
    await fs.rm(archiveFolderPath, { recursive: true, force: true });
    
    // Re-add the folder to the database if needed
    if (folderData.id) {
      // Recreate the folder in the database
      const folder: Folder = {
        id: folderData.id,
        absoluteRoute: folderData.absoluteRoute,
        excludePatterns: JSON.parse(folderData.excludePatterns || '[]') as string[],
        lastSync: folderData.lastSync ? new Date(folderData.lastSync) : null,
        totalBytes: folderData.totalBytes,
        countFiles: folderData.countFiles,
        checksum: folderData.checksum,
        merging: folderData.merging || false,
      };
      await addFolder(folder);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring folder from archive:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to restore folder from archive' 
      },
      { status: 500 }
    );
  }
}
