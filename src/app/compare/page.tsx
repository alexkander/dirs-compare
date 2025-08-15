'use client';

import { useEffect, useState } from 'react';
import { Folder } from '../../lib/folderStore';
import { FileItem } from '../../lib/fileItemStore';
import { formatBytes, formatChecksum } from '../../lib/formatters';
import path from 'path';

const getFileItemsForFolder = async (folderId: string): Promise<FileItem[]> => {
  try {
    const response = await fetch(`/api/folders/${folderId}/files`);
    if (!response.ok) {
      throw new Error(`Failed to fetch file items for folder ${folderId}`);
    }
    const fileItems: FileItem[] = await response.json();
    // The API returns items sorted by relativeRoute, so no extra sorting is needed here.
    return fileItems;
  } catch (error) {
    console.error(error);
    return [];
  }
};


const AddFolderToCompare = ({ allFolders, onAddFolder, selectedFolderIds }: { allFolders: Folder[], onAddFolder: (folderId: string) => void, selectedFolderIds: string[] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const availableFolders = allFolders.filter(f => !selectedFolderIds.includes(f.id) && f.absoluteRoute.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="mb-8">
      <input
        type="text"
        placeholder="Search for a folder to compare..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 bg-gray-800 text-white border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {searchTerm && (
        <ul className="bg-gray-800 border border-gray-600 rounded-md mt-2 max-h-60 overflow-y-auto">
          {availableFolders.map(folder => (
            <li key={folder.id} className="px-4 py-2 hover:bg-gray-700 cursor-pointer flex justify-between items-center" onClick={() => { onAddFolder(folder.id); setSearchTerm(''); }}>
              <span>{folder.absoluteRoute}</span>
              <button className="text-blue-400 hover:text-blue-300">Add</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

import { useMemo } from 'react';

const CompareFolderColumn = ({ folder, fileItems, unifiedFileRoutes, matchingChecksumRoutes, mismatchedChecksumRoutes }: { folder: Folder, fileItems: FileItem[], unifiedFileRoutes: string[], matchingChecksumRoutes: Set<string>, mismatchedChecksumRoutes: Set<string> }) => {
  const fileItemsByRoute = useMemo(() => new Map(fileItems.map(item => [item.relativeRoute, item])), [fileItems]);
  return (
    <div className="flex-1 min-w-[400px] bg-gray-800 rounded-lg border border-gray-700">
      <div>
        <h3 className="text-lg font-bold text-white mb-1 truncate px-4 pt-4" title={folder.absoluteRoute}>{path.basename(folder.absoluteRoute)}</h3>
        <div className="px-4 mb-2">
          <p className="text-xs text-gray-400 truncate" title={folder.absoluteRoute}>
            {folder.absoluteRoute}
          </p>
          <p className="text-xs text-gray-500 font-mono truncate">
            ID: {folder.id}
          </p>
          <p className="text-xs text-gray-500 font-mono truncate">
            Checksum: {formatChecksum(folder.checksum)}
          </p>
          <p className="text-xs text-gray-500 truncate">
            Last Sync: {folder.lastSync ? new Date(folder.lastSync).toLocaleString() : 'Never'}
          </p>
        </div>
      </div>
      <div className="">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr>
              <th className="text-right py-1 px-2 text-gray-400 font-semibold w-10">#</th>
              <th className="text-left py-1 px-2 text-gray-400 font-semibold">File</th>
              <th className="text-left py-1 px-2 text-gray-400 font-semibold">Size</th>
              <th className="text-left py-1 px-2 text-gray-400 font-semibold">Checksum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {unifiedFileRoutes.map((route, index) => {
              const item = fileItemsByRoute.get(route);
              if (item) {
                return (
                  <tr key={item.id} className={
                    matchingChecksumRoutes.has(item.relativeRoute) ? 'bg-green-500/10' :
                    mismatchedChecksumRoutes.has(item.relativeRoute) ? 'bg-yellow-500/10' :
                    'bg-red-500/10'
                  }>
                    <td className="text-right py-1 px-2 text-gray-500">{index + 1}</td>
                    <td className="py-1 px-2 text-gray-300 truncate" title={item.relativeRoute}>{item.relativeRoute}</td>
                    <td className="py-1 px-2 text-gray-300 whitespace-nowrap">{formatBytes(item.sizeBytes)}</td>
                    <td className="py-1 px-2 text-gray-300 font-mono">{formatChecksum(item.checksum)}</td>
                  </tr>
                );
              } else {
                return (
                  <tr key={route} className="h-[25px]">
                    <td className="text-right py-1 px-2 text-gray-500">{index + 1}</td>
                    <td colSpan={3} className="bg-red-500/10"></td>
                  </tr>
                );
              }
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default function ComparePage() {
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Folder[]>([]);
  const [fileItemsMap, setFileItemsMap] = useState<Record<string, FileItem[]>>({});

  const { unifiedFileRoutes, matchingChecksumRoutes, mismatchedChecksumRoutes } = useMemo((): { unifiedFileRoutes: string[]; matchingChecksumRoutes: Set<string>; mismatchedChecksumRoutes: Set<string> } => {
    const numSelectedFolders = selectedFolders.length;
    if (numSelectedFolders < 2) {
      const allRoutes = new Set(Object.values(fileItemsMap).flat().map(item => item.relativeRoute));
      const sortedRoutes = Array.from(allRoutes).sort((a, b) => a.localeCompare(b));
      return { unifiedFileRoutes: sortedRoutes, matchingChecksumRoutes: new Set(), mismatchedChecksumRoutes: new Set() };
    }

    const allFileItems = Object.values(fileItemsMap).flat();
    const allRoutes = new Set(allFileItems.map(item => item.relativeRoute));
    const sortedRoutes = Array.from(allRoutes).sort((a, b) => a.localeCompare(b));

    const matchingChecksumRoutes = new Set<string>();
    const mismatchedChecksumRoutes = new Set<string>();

    for (const route of sortedRoutes) {
      const itemsForRoute: FileItem[] = [];
      for (const folderId of selectedFolders.map(f => f.id)) {
        const item = fileItemsMap[folderId]?.find(i => i.relativeRoute === route);
        if (item) {
          itemsForRoute.push(item);
        }
      }

      if (itemsForRoute.length === numSelectedFolders) {
        const checksums = new Set(itemsForRoute.map(i => i.checksum));
        if (checksums.size === 1) {
          matchingChecksumRoutes.add(route);
        } else {
          mismatchedChecksumRoutes.add(route);
        }
      }
    }

    return { unifiedFileRoutes: sortedRoutes, matchingChecksumRoutes, mismatchedChecksumRoutes };
  }, [fileItemsMap, selectedFolders]);

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const response = await fetch('/api/folders');
        if (!response.ok) throw new Error('Failed to fetch folders');
        const data: Folder[] = await response.json();
        setAllFolders(data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchFolders();
  }, []);

  const handleAddFolder = async (folderId: string) => {
    const folderToAdd = allFolders.find(f => f.id === folderId);
    if (folderToAdd && !selectedFolders.some(f => f.id === folderId)) {
      setSelectedFolders(prev => [...prev, folderToAdd]);
      const items = await getFileItemsForFolder(folderId);
      setFileItemsMap(prev => ({ ...prev, [folderId]: items }));
    }
  };

  return (
    <div className="container mx-auto p-8 text-white">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Compare Folders</h1>
        <p className="text-gray-400">Select folders to compare their contents side-by-side.</p>
      </header>

      <AddFolderToCompare 
        allFolders={allFolders} 
        onAddFolder={handleAddFolder} 
        selectedFolderIds={selectedFolders.map(f => f.id)}
      />

      <main className="flex overflow-x-auto pb-4">
        {selectedFolders.map(folder => (
          <CompareFolderColumn 
            key={folder.id} 
            folder={folder} 
            fileItems={fileItemsMap[folder.id] || []}
            unifiedFileRoutes={unifiedFileRoutes}
            matchingChecksumRoutes={matchingChecksumRoutes}
            mismatchedChecksumRoutes={mismatchedChecksumRoutes}
          />
        ))}

        {selectedFolders.length === 0 && (
            <div className="w-full text-center py-16 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700">
                <p className="text-gray-400">Search for and add folders to begin comparison.</p>
            </div>
        )}
      </main>
    </div>
  );
}
