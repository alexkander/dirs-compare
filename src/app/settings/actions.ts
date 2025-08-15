'use server';

import { revalidatePath } from 'next/cache';
import { updateSettings, Settings } from '@/lib/settingsStore';

export async function updateSettingsAction(newPatterns: string[]) {
  try {
    const settings: Settings = {
      globalExcludePatterns: newPatterns,
    };
    updateSettings(settings);
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return { error: `Failed to update settings: ${errorMessage}` };
  }
}
