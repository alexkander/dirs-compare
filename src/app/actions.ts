'use server';

import { revalidatePath } from 'next/cache';
import { addFolder } from '../lib/folderStore';
import { getSubdirectories } from '../lib/directoryScanner';
import { z } from 'zod';

const schema = z.object({
  absoluteRoute: z.string().min(1),
  addSubdirectories: z.string().optional(),
});

export async function createFolderAction(formData: FormData) {
  const parsed = schema.parse({
    absoluteRoute: formData.get('absoluteRoute'),
    addSubdirectories: formData.get('addSubdirectories') || undefined,
  });

  try {
    if (parsed.addSubdirectories) {
      const subdirectories = await getSubdirectories(parsed.absoluteRoute);
      for (const subdir of subdirectories) {
        await addFolder(subdir);
      }
    } else {
      await addFolder(parsed.absoluteRoute);
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to add folder:', error);
    return { error: 'Failed to add folder.' };
  }
}
