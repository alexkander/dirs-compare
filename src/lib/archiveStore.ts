export interface ArchivedFolder {
  id: string;
  absoluteRoute: string;
  lastSync: string | null;
  excludePatterns: string | null;
  totalBytes: number | null;
  countFiles: number | null;
  checksum: string | null;
  // extra fields
  name: string;
  archivedAt: string;
}