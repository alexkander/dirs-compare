'use server';

import { revalidatePath } from 'next/cache';
import { addFolder } from '../lib/folderStore';

export async function createFolderAction(formData: FormData) {
  const absoluteRoute = formData.get('absoluteRoute') as string;
  if (!absoluteRoute) {
    return { error: 'Route is required.' };
  }

  try {
    await addFolder(absoluteRoute);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to add folder:', error);
    return { error: 'Failed to add folder.' };
  }
}
