import { NextResponse } from 'next/server';
import { getFolderById, deleteFolder } from '../../../../lib/folderStore';
import { deleteFileItemsByFolderId } from '../../../../lib/fileItemStore';

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

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id: folderId } = await params;

  if (!folderId) {
    return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
  }

  try {
    // First, delete all file items associated with the folder
    await deleteFileItemsByFolderId(folderId);

    // Then, delete the folder itself
    await deleteFolder(folderId);

    return NextResponse.json({ message: 'Folder and associated files deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error(`Failed to delete folder ${folderId}:`, error);
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
