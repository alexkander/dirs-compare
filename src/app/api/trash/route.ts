import { NextResponse } from 'next/server';
import { moveFolderToTrash } from '@/app/actions/trash';
import { addFolder, updateFolder } from '@/lib/folderStore';
import { getSettings } from '@/lib/settingsStore';
import fs from 'fs/promises';
import path from 'path';

interface TrashedFolder {
  id: string;
  name: string;
  originalPath: string;
  deletedAt: string;
  size: number;
  fileCount: number;
}

// GET /api/trash - Get all trashed folders
export async function GET() {
  try {
    const settings = getSettings();
    const trashDir = settings.trashDirectory || './.trash';
    
    // Check if trash directory exists
    try {
      await fs.access(trashDir);
    } catch (error) {
      // If directory doesn't exist, return empty array
      return NextResponse.json([]);
    }
    
    // Read all subdirectories in the trash directory
    const entries = await fs.readdir(trashDir, { withFileTypes: true });
    const folderEntries = entries.filter(entry => entry.isDirectory());
    
    const folders: TrashedFolder[] = [];
    
    // Process each folder
    for (const entry of folderEntries) {
      try {
        const folderPath = path.join(trashDir, entry.name);
        const folderJsonPath = path.join(folderPath, 'folder.json');
        
        // Read the folder.json file
        const folderData = JSON.parse(await fs.readFile(folderJsonPath, 'utf-8'));
        
        // Get folder stats
        const stats = await fs.stat(folderPath);
        
        folders.push({
          id: entry.name,
          name: path.basename(folderData.originalAbsoluteRoute || folderData.originalPath || 'Unknown'),
          originalPath: folderData.originalAbsoluteRoute || folderData.originalPath || 'Unknown',
          deletedAt: stats.birthtime.toISOString(),
          size: folderData.size || 0,
          fileCount: folderData.fileCount || 0
        });
      } catch (err) {
        console.error(`Error processing folder ${entry.name}:`, err);
        // Skip this folder but continue with others
      }
    }
    
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Error getting trashed folders:', error);
    return NextResponse.json(
      { error: 'Failed to get trashed folders' },
      { status: 500 }
    );
  }
}

// POST /api/trash - Move folder to trash
export async function POST(request: Request) {
  try {
    const { folderId } = await request.json();
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    const result = await moveFolderToTrash(folderId);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to move folder to trash' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error in move to trash API:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// PATCH /api/trash - Restore a folder from trash
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
    const trashDir = settings.trashDirectory || './.trash';
    const folderPath = path.join(trashDir, folderId);
    const folderJsonPath = path.join(folderPath, 'folder.json');

    // Read the folder metadata
    const folderData = JSON.parse(await fs.readFile(folderJsonPath, 'utf-8'));
    const originalPath = folderData.originalAbsoluteRoute || folderData.originalPath;
    
    if (!originalPath) {
      throw new Error('Original path not found in folder metadata');
    }

    // Check if the original location exists
    try {
      await fs.access(originalPath);
      return NextResponse.json(
        { error: 'A folder already exists at the original location' },
        { status: 409 }
      );
    } catch (err: unknown) {
      // Original location doesn't exist, which is what we want
      if (err instanceof Error) {
        console.log(`Original location ${originalPath} is available for restoration: ${err.message}`);
      } else {
        console.log(`Original location ${originalPath} is available for restoration`);
      }
    }

    // Get the actual folder to restore (the subfolder inside the trash directory)
    const entries = await fs.readdir(folderPath, { withFileTypes: true });
    const folderToRestore = entries.find(entry => 
      entry.isDirectory() && entry.name !== '.trash' && entry.name !== 'folder.json'
    );

    if (!folderToRestore) {
      throw new Error('No folder found to restore in trash directory');
    }

    const sourcePath = path.join(folderPath, folderToRestore.name);
    
    // Create parent directory if it doesn't exist
    await fs.mkdir(path.dirname(originalPath), { recursive: true });
    
    // Move the folder back to its original location
    await fs.rename(sourcePath, originalPath);
    
    // Remove the now-empty trash directory
    await fs.rm(folderPath, { recursive: true, force: true });

    // Add the folder back to the database
    const newFolder = {
      id: folderId,
      absoluteRoute: originalPath,
      excludePatterns: folderData.excludePatterns || [],
      lastSync: folderData.lastSync ? new Date(folderData.lastSync) : null,
      totalBytes: folderData.totalBytes,
      countFiles: folderData.countFiles,
      checksum: folderData.checksum
    };

    console.log({newFolder, folderData})
    
    // First add the folder with a basic record
    addFolder(newFolder);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error restoring folder:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to restore folder' },
      { status: 500 }
    );
  }
}

// DELETE /api/trash - Permanently delete a folder from trash
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('id');
    
    if (!folderId) {
      return NextResponse.json(
        { error: 'Folder ID is required' },
        { status: 400 }
      );
    }

    const settings = getSettings();
    const trashDir = settings.trashDirectory || './.trash';
    const folderPath = path.join(trashDir, folderId);

    // Remove the folder and all its contents
    await fs.rm(folderPath, { recursive: true, force: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting folder:', error);
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    );
  }
}
