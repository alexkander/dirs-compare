import { db } from './db';

export interface Settings {
  globalExcludePatterns: string[];
}

const defaultSettings: Settings = {
  globalExcludePatterns: ['.git', 'node_modules'],
};

// This function will always return settings, creating them if they don't exist.
export function getSettings(): Settings {
  const stmt = db.prepare('SELECT globalExcludePatterns FROM settings WHERE id = 1');
  const row = stmt.get() as { globalExcludePatterns: string } | undefined;

  if (row) {
    return {
      globalExcludePatterns: JSON.parse(row.globalExcludePatterns),
    };
  } else {
    // No settings found, create them with default values
    const insertStmt = db.prepare('INSERT INTO settings (id, globalExcludePatterns) VALUES (1, ?)');
    insertStmt.run(JSON.stringify(defaultSettings.globalExcludePatterns));
    return defaultSettings;
  }
}

export function updateSettings(settings: Settings): void {
  const stmt = db.prepare('UPDATE settings SET globalExcludePatterns = ? WHERE id = 1');
  stmt.run(JSON.stringify(settings.globalExcludePatterns));
}
