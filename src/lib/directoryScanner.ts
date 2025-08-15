import fs from 'fs/promises';
import path from 'path';

export interface DirectoryNode {
  name: string;
  relativePath: string;
  children?: DirectoryNode[];
}

export async function getDirectoryTree(rootDir: string): Promise<DirectoryNode | null> {
  try {
    // Check if the root directory exists and is a directory
    const stats = await fs.stat(rootDir);
    if (!stats.isDirectory()) {
      console.error(`Path is not a directory: ${rootDir}`);
      return null;
    }
  } catch (error) {
    console.error(`Error accessing directory: ${rootDir}`, error);
    return null; // Directory does not exist or other access error
  }

  async function readDir(currentPath: string, relativePath: string): Promise<DirectoryNode> {
    const name = path.basename(currentPath);
    const node: DirectoryNode = { name, relativePath };
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    const directories = entries.filter(entry => entry.isDirectory());

    if (directories.length > 0) {
      node.children = await Promise.all(
        directories.map(dir =>
          readDir(path.join(currentPath, dir.name), path.join(relativePath, dir.name))
        )
      );
    }
    return node;
  }

  return readDir(rootDir, '.');
}
