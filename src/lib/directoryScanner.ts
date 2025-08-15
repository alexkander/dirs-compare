import fs from 'fs/promises';
import path from 'path';

export interface DirectoryNode {
  name: string;
  relativePath: string;
  children?: DirectoryNode[];
}

export async function getSubdirectories(absoluteRoute: string): Promise<string[]> {
  const items = await fs.readdir(absoluteRoute, { withFileTypes: true });
  return items
    .filter(item => item.isDirectory())
    .map(item => path.join(absoluteRoute, item.name));
}

export async function getDirectoryTree(rootDir: string, excludePatterns: string[] = []): Promise<DirectoryNode | null> {
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

  async function scan(directoryPath: string, relativePath: string): Promise<DirectoryNode | null> {
    const name = path.basename(directoryPath);
    if (excludePatterns.some(pattern => new RegExp(pattern).test(name))) {
      return null;
    }

    const node: DirectoryNode = { name, relativePath, children: [] };
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    const childPromises = entries.map(async (entry) => {
      const childPath = path.join(directoryPath, entry.name);
      const childRelativePath = path.join(relativePath, entry.name);
      if (entry.isDirectory()) {
        return scan(childPath, childRelativePath);
      } else {
        if (excludePatterns.some(pattern => new RegExp(pattern).test(entry.name))) {
          return null;
        }
        return { name: entry.name, relativePath: childRelativePath };
      }
    });

    const children = (await Promise.all(childPromises)).filter((c): c is DirectoryNode => c !== null);

    if (children.length > 0) {
      node.children = children;
    }

    return node;
  }

  return scan(rootDir, '.');
}
