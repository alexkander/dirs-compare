import { NextResponse } from 'next/server';
import { syncFolder } from '../../../lib/syncManager';

export async function POST(request: Request) {
  const { folderId } = await request.json();

  if (!folderId) {
    return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
  }

  try {
    await syncFolder(folderId);
    return NextResponse.json({ message: 'Sync completed successfully' });
  } catch (error) {
    console.error(`Failed to sync folder ${folderId}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to sync folder', details: errorMessage }, { status: 500 });
  }
}
