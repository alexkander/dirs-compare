import { NextResponse } from 'next/server';
import { getFolderById } from '@/lib/folderStore';
import { getFileItemsByFolder } from '@/lib/fileItemStore';
import fs from 'fs';
import path from 'path';
import { syncFolder } from '@/lib/syncManager';

export async function POST(request: Request) {
  try {
    const { sourceFolderId, targetFolderId } = await request.json();

    // Get source and target folders
    const sourceFolder = getFolderById(sourceFolderId);
    const targetFolder = getFolderById(targetFolderId);

    if (!sourceFolder || !targetFolder) {
      return NextResponse.json(
        { error: 'Source or target folder not found' },
        { status: 404 }
      );
    }

    // Get all file items from source folder
    const fileItems = await getFileItemsByFolder(sourceFolderId);


    // Copy each file
    for (const fileItem of fileItems) {
      const sourcePath = path.join(sourceFolder.absoluteRoute, fileItem.relativeRoute);
      const targetPath = path.join(targetFolder.absoluteRoute, fileItem.relativeRoute);
      
      // Ensure target directory exists
      const targetDir = path.dirname(targetPath);
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Copy file
      fs.copyFileSync(sourcePath, targetPath);
    }

    // Sync the target folder to update its state
    await syncFolder(targetFolderId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error copying files:', error);
    return NextResponse.json(
      { error: 'Failed to copy files' },
      { status: 500 }
    );
  }
}
