import { NextResponse } from 'next/server';
import { moveFolderToTrash } from '@/app/actions/trash';

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
  } catch (error) {
    console.error('Error in move to trash API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
