import { createHash } from 'crypto';
import { getFileItemsByFolder } from './fileItemStore';

export function calculateFolderChecksum(folderId: string): string {
  const fileItems = getFileItemsByFolder(folderId);
  const sortedItems = [...fileItems].sort((a, b) => a.relativeRoute.localeCompare(b.relativeRoute));
  const checksums = sortedItems.map(item => item.checksum);
  const combinedChecksums = checksums.join('');

  const hash = createHash('sha256');
  hash.update(combinedChecksums);
  return hash.digest('hex');
}
