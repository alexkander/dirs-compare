import { NextResponse } from 'next/server';
import { getFolders } from '../../../lib/folderStore';

export async function GET() {
  try {
    const folders = await getFolders();
    return NextResponse.json(folders);
  } catch (error) {
    console.error('Failed to get folders:', error);
    return NextResponse.json({ message: 'Failed to get folders' }, { status: 500 });
  }
}
