import { NextResponse } from 'next/server';
import { getFileItemsByFolder } from '@/lib/fileItemStore';

export async function GET(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const folderId = context.params.id;
    if (!folderId) {
      return NextResponse.json({ message: 'Folder ID is required' }, { status: 400 });
    }
    const fileItems = getFileItemsByFolder(folderId);
    return NextResponse.json(fileItems);
  } catch (error) {
    const folderId = context.params.id;
    console.error(`Failed to get file items for folder ${folderId}:`, error);
    return NextResponse.json({ message: 'Failed to get file items' }, { status: 500 });
  }
}
