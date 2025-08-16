import { NextResponse } from 'next/server';
import { getFolders, addFolder } from '../../../lib/folderStore';
import { getSettings } from '../../../lib/settingsStore';
import fs from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const folders = await getFolders();
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Failed to get folders:', error);
    return NextResponse.json({ message: 'Failed to get folders' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { folderName, merging } = await request.json();
    
    // Only allow creating merge folders for now
    if (merging !== true) {
      return NextResponse.json(
        { error: 'Only merge folders can be created (merging=true)' },
        { status: 400 }
      );
    }
    
    if (!folderName) {
      return NextResponse.json(
        { error: 'folderName is required when merging=true' },
        { status: 400 }
      );
    }
    
    // Get merge directory from settings
    const settings = await getSettings();
    const mergeDir = settings.mergeDirectory || './merged';
    const absoluteRoute = path.join(mergeDir, folderName);
    
    // Check if folder already exists in the database
    const folders = await getFolders();
    const existingFolder = folders.find(f => f.absoluteRoute === absoluteRoute);
    if (existingFolder) {
      return NextResponse.json(
        { error: 'A folder with this path already exists' },
        { status: 400 }
      );
    }
    
    // Create the merge directory
    try {
      await fs.mkdir(absoluteRoute, { recursive: true });
    } catch (error) {
      console.error(`Failed to create directory ${absoluteRoute}:`, error);
      return NextResponse.json(
        { error: `Failed to create merge directory: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    // Create new folder with merging flag
    const newFolder = await addFolder({ 
      absoluteRoute,
      merging,
      // Default values
      excludePatterns: [],
      totalBytes: 0,
      countFiles: 0,
      checksum: null,
      lastSync: new Date()
    });

    console.log({newFolder});
    
    return NextResponse.json(newFolder, { status: 201 });
    
  } catch (error) {
    console.error('Failed to create folder:', error);
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    );
  }
}
