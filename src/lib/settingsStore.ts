import { db } from './db';

export interface Settings {
  globalExcludePatterns: string[];
  trashDirectory: string;
}

const defaultSettings: Settings = {
  globalExcludePatterns: ['.git', 'node_modules'],
  trashDirectory: './.trash',
};

// This function will always return settings, creating them if they don't exist.
export function getSettings(): Settings {
  const stmt = db.prepare('SELECT globalExcludePatterns, trashDirectory FROM settings WHERE id = 1');
  const row = stmt.get() as { globalExcludePatterns: string, trashDirectory?: string } | undefined;

  if (row) {
    return {
      globalExcludePatterns: JSON.parse(row.globalExcludePatterns),
      trashDirectory: row.trashDirectory || defaultSettings.trashDirectory,
    };
  } else {
    // No settings found, create them with default values
    const insertStmt = db.prepare('INSERT INTO settings (id, globalExcludePatterns, trashDirectory) VALUES (1, ?, ?)');
    insertStmt.run(
      JSON.stringify(defaultSettings.globalExcludePatterns),
      defaultSettings.trashDirectory
    );
    return defaultSettings;
  }
}

export function updateSettings(settings: Settings): void {
  const stmt = db.prepare('UPDATE settings SET globalExcludePatterns = ?, trashDirectory = ? WHERE id = 1');
  stmt.run(
    JSON.stringify(settings.globalExcludePatterns),
    settings.trashDirectory
  );
}
