'use server';

import { getFolderById, updateFolder } from '@/lib/folderStore';
import { revalidatePath } from 'next/cache';

export async function updateExcludePatternsAction(
  folderId: string,
  excludePatterns: string[]
) {
  try {
    const folder = await getFolderById(folderId);
    if (!folder) {
      return { error: 'Folder not found.' };
    }

    const updatedFolder = { ...folder, excludePatterns };
    await updateFolder(updatedFolder);

    // Revalidate the edit page and the home page to reflect changes
    revalidatePath(`/folders/${folderId}/edit`);
    revalidatePath('/');

    return { success: true };
  } catch (error) {
    console.error('Failed to update exclude patterns:', error);
    return { error: 'Failed to update a folder.' };
  }
}
