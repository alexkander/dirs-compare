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

const CompareFolderColumn = ({ folder, fileItems }: { folder: Folder, fileItems: FileItem[] }) => {
  return (
    <div className="flex-1 min-w-[400px] bg-gray-800 rounded-lg p-4 border border-gray-700">
      <h3 className="text-lg font-bold text-white mb-4 truncate" title={folder.absoluteRoute}>{path.basename(folder.absoluteRoute)}</h3>
      <div className="">
        <table className="min-w-full text-sm">
          <thead className="sticky top-0 bg-gray-800">
            <tr>
              <th className="text-left py-1 px-2 text-gray-400 font-semibold">File</th>
              <th className="text-left py-1 px-2 text-gray-400 font-semibold">Size</th>
              <th className="text-left py-1 px-2 text-gray-400 font-semibold">Checksum</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {fileItems.map(item => (
              <tr key={item.id}>
                <td className="py-1 px-2 text-gray-300 truncate" title={item.relativeRoute}>{item.relativeRoute}</td>
                <td className="py-1 px-2 text-gray-300 whitespace-nowrap">{formatBytes(item.sizeBytes)}</td>
                <td className="py-1 px-2 text-gray-300 font-mono">{formatChecksum(item.checksum)}</td>
              </tr>
            ))}
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

      <main className="flex gap-4 overflow-x-auto pb-4">
        {selectedFolders.map(folder => (
          <CompareFolderColumn 
            key={folder.id} 
            folder={folder} 
            fileItems={fileItemsMap[folder.id] || []}
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
