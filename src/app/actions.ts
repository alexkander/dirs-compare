'use server';

import { revalidatePath } from 'next/cache';
import { addFolder } from '../lib/folderStore';

export async function createFolderAction(formData: FormData) {
  const route = formData.get('route') as string;
  if (!route) {
    return { error: 'Route is required.' };
  }

  try {
    await addFolder(route);
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    return { error: 'Failed to add folder.' };
  }
}
