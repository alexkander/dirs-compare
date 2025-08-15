export function formatChecksum(checksum: string | null | undefined, length = 8): string {
  if (!checksum) {
    return '';
  }
  return checksum.substring(0, length);
}

export function formatBytes(bytes: number | null | undefined, decimals = 2): string {
  if (bytes === null || bytes === undefined) return '';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}
