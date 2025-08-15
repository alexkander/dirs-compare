import { NextResponse } from 'next/server';
import { getFileItemsByFolder } from '@/lib/fileItemStore';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id: folderId } = await params;
    if (!folderId) {
      return NextResponse.json({ message: 'Folder ID is required' }, { status: 400 });
    }

    const fileItems = getFileItemsByFolder(folderId);
    return NextResponse.json(fileItems);
  } catch (error) {
    console.error(`Failed to get file items for folder ${params.id}:`, error);
    return NextResponse.json({ message: 'Failed to get file items' }, { status: 500 });
  }
}
