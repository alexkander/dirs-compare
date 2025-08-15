import { NextResponse } from 'next/server';
import { getFolderById } from '@/lib/folderStore';

export async function GET(request: Request, context: { params: { id: string } }) {
  const { params } = context;
  try {
    const { id: folderId } = await params;
    if (!folderId) {
      return NextResponse.json({ message: 'Folder ID is required' }, { status: 400 });
    }

    const folder = getFolderById(folderId);
    if (!folder) {
      return NextResponse.json({ message: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json(folder);
  } catch (error) {
    console.error(`Error fetching folder ${params.id}:`, error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
