'use server';

import { revalidatePath } from 'next/cache';
import { addFolder, getFolders } from '../lib/folderStore';
import { getSubdirectories } from '../lib/directoryScanner';
import { z } from 'zod';

const schema = z.object({
  absoluteRoute: z.string().min(1),
  addSubdirectories: z.string().optional(),
});

function folderExists(absoluteRoute: string): boolean {
  const folders = getFolders();
  return folders.some(folder => 
    folder.absoluteRoute.toLowerCase() === absoluteRoute.toLowerCase()
  );
}

export async function createFolderAction(formData: FormData) {
  const absoluteRoute = formData.get('absoluteRoute') as string;
  const addSubdirectories = formData.get('addSubdirectories');
  
  const parsed = schema.parse({
    absoluteRoute,
    addSubdirectories: addSubdirectories || undefined,
  });

  try {
    // Check if folder already exists
    if (folderExists(parsed.absoluteRoute)) {
      return { error: 'A folder with this path already exists.' };
    }

    if (parsed.addSubdirectories) {
      const subdirectories = await getSubdirectories(parsed.absoluteRoute);
      for (const subdir of subdirectories) {
        if (!folderExists(subdir)) {
          await addFolder({ absoluteRoute: subdir });
        }
      }
    } else {
      await addFolder({ absoluteRoute: parsed.absoluteRoute });
    }

    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Failed to add folder:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to add folder.';
    return { error: errorMessage };
  }
}
