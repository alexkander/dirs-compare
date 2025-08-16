import { db } from './db';

export interface Settings {
  globalExcludePatterns: string[];
  trashDirectory: string;
  archivedProjectsPath: string;
}

const defaultSettings: Settings = {
  globalExcludePatterns: ['.git', 'node_modules'],
  trashDirectory: './.trash',
  archivedProjectsPath: './.archive',
};

// This function will always return settings, creating them if they don't exist.
export function getSettings(): Settings {
  const stmt = db.prepare('SELECT globalExcludePatterns, trashDirectory, archivedProjectsPath FROM settings WHERE id = 1');
  const row = stmt.get() as { 
    globalExcludePatterns: string, 
    trashDirectory?: string, 
    archivedProjectsPath?: string 
  } | undefined;

  if (row) {
    return {
      globalExcludePatterns: JSON.parse(row.globalExcludePatterns),
      trashDirectory: row.trashDirectory || defaultSettings.trashDirectory,
      archivedProjectsPath: row.archivedProjectsPath || defaultSettings.archivedProjectsPath,
    };
  } else {
    // No settings found, create them with default values
    const insertStmt = db.prepare(
      'INSERT INTO settings (id, globalExcludePatterns, trashDirectory, archivedProjectsPath) VALUES (1, ?, ?, ?)'
    );
    insertStmt.run(
      JSON.stringify(defaultSettings.globalExcludePatterns),
      defaultSettings.trashDirectory,
      defaultSettings.archivedProjectsPath
    );
    return defaultSettings;
  }
}

export function updateSettings(settings: Settings): void {
  const stmt = db.prepare(
    'UPDATE settings SET globalExcludePatterns = ?, trashDirectory = ?, archivedProjectsPath = ? WHERE id = 1'
  );
  stmt.run(
    JSON.stringify(settings.globalExcludePatterns),
    settings.trashDirectory,
    settings.archivedProjectsPath
  );
}
