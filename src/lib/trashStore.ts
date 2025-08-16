export interface TrashedFolder  {
  id: string;
  absoluteRoute: string;
  lastSync: string | null;
  excludePatterns: string | null;
  totalBytes: number | null;
  countFiles: number | null;
  checksum: string | null;
  merging: boolean;
  // extra fields
  name: string;
  deletedAt: string;
}