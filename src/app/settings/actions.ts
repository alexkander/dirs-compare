'use server';

import { revalidatePath } from 'next/cache';
import { updateSettings, Settings } from '@/lib/settingsStore';

interface UpdateSettingsParams {
  globalExcludePatterns: string[];
  trashDirectory: string;
  archivedProjectsPath: string;
}

export async function updateSettingsAction({ globalExcludePatterns, trashDirectory, archivedProjectsPath }: UpdateSettingsParams) {
  try {
    const settings: Settings = {
      globalExcludePatterns,
      trashDirectory,
      archivedProjectsPath,
    };
    updateSettings(settings);
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { error: `Failed to update settings: ${errorMessage}` };
  }
}
