'use client';
import Link from 'next/link';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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

const AddFolderToMerge = ({ allFolders, onAddFolder, selectedFolderIds }: { allFolders: Folder[], onAddFolder: (folderId: string) => void, selectedFolderIds: string[] }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const availableFolders = allFolders.filter(f => !selectedFolderIds.includes(f.id) && f.absoluteRoute.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="mb-8">
      <input
        type="text"
        placeholder="Search for a folder to merge..."
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



interface MergeFolderColumnProps {
  folder: Folder;
  fileItems: FileItem[];
  unifiedFileRoutes: string[];
  matchingChecksumRoutes: Set<string>;
  mismatchedChecksumRoutes: Set<string>;
  missingInMergeColumn: Set<string>;
  selectedFolders: Folder[];
  onRemove: (folderId: string) => void;
}

const MergeFolderColumn = ({ 
  folder, 
  fileItems, 
  unifiedFileRoutes, 
  matchingChecksumRoutes, 
  mismatchedChecksumRoutes, 
  missingInMergeColumn, 
  selectedFolders,
  onRemove 
}: MergeFolderColumnProps) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: folder.id }),
      });
      if (!response.ok) {
        throw new Error('Sync failed');
      }
      window.location.reload();
    } catch (error) {
      console.error('An error occurred during sync:', error);
      alert('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleMoveToArchive = async () => {
    if (window.confirm('Are you sure you want to move this folder to archive? The folder will be moved to the archive directory for long-term storage.')) {
      setIsArchiving(true);
      try {
        const response = await fetch('/api/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId: folder.id }),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to move folder to archive');
        }
        onRemove(folder.id);
      } catch (error) {
        console.error('Error moving to archive:', error);
        alert(`Failed to move to archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setIsArchiving(false);
      }
    }
  };

  const handleCopyFiles = async () => {
    if (!selectedFolders.length) return;
    
    const mergeFolderId = selectedFolders[0].id;
    if (folder.id === mergeFolderId) return; // Don't copy to self
    
    setIsCopying(true);
    try {
      const response = await fetch('/api/copy-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFolderId: folder.id,
          targetFolderId: mergeFolderId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to copy files');
      }
      
      // Refresh the page to show updated state
      window.location.reload();
    } catch (error) {
      console.error('Error copying files:', error);
      alert('Failed to copy files. Check console for details.');
    } finally {
      setIsCopying(false);
    }
  };
  const fileItemsByRoute = useMemo(() => new Map(fileItems.map(item => [item.relativeRoute, item])), [fileItems]);
  return (
    <div className="flex-1 min-w-[400px] bg-gray-800 rounded-lg border border-gray-700">
      <div>
        <div className="flex justify-between items-center pr-4">
          <h3 className="text-lg font-bold text-white mb-1 truncate px-4 pt-4" title={folder.absoluteRoute}>{path.basename(folder.absoluteRoute)}</h3>
          <div className="flex items-center gap-2">
            {selectedFolders.length > 0 && selectedFolders[0].id !== folder.id && (
              <button
                onClick={handleCopyFiles}
                disabled={isCopying || isSyncing || isArchiving}
                className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-xs disabled:bg-gray-600 mr-1"
                title="Copy files to merge folder"
              >
                {isCopying ? 'Copying...' : 'Copy Files'}
              </button>
            )}
            <button
              onClick={handleSync}
              disabled={isSyncing || isCopying || isArchiving}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-1 px-2 rounded text-xs disabled:bg-gray-600"
            >
              {isSyncing ? 'Syncing...' : 'Sync'}
            </button>
            {/* Archive button - only show for non-first columns */}
            {selectedFolders.length > 0 && selectedFolders[0].id !== folder.id && (
              <button
                onClick={handleMoveToArchive}
                disabled={isArchiving || isSyncing || isCopying}
                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs disabled:bg-indigo-400"
                title="Move folder to archive"
              >
                {isArchiving ? 'Archiving...' : 'Archive'}
              </button>
            )}
            <button 
              onClick={() => onRemove(folder.id)} 
              disabled={isArchiving || isSyncing || isCopying}
              className="text-red-500 hover:text-red-400 text-xs disabled:text-red-300"
            >
              Remove
            </button>
          </div>
        </div>
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
                // For merge column (first folder), use the normal coloring
                // For other columns, only apply color if the file exists in that column
                const isMergeColumn = selectedFolders[0]?.id === folder.id;
                const shouldShowColor = isMergeColumn || fileItems.some(fi => fi.relativeRoute === route);
                
                return (
                  <tr key={item.id} className={
                    shouldShowColor ? (
                      missingInMergeColumn.has(item.relativeRoute) ? 'bg-red-500/10' :
                      matchingChecksumRoutes.has(item.relativeRoute) ? 'bg-green-500/10' :
                      mismatchedChecksumRoutes.has(item.relativeRoute) ? 'bg-yellow-500/10' : ''
                    ) : ''
                  }>
                    <td className="text-right px-1 text-gray-500">{index + 1}</td>
                    <td className="px-1 text-gray-300 max-w-xs truncate overflow-hidden" title={item.relativeRoute}>
                      <span className="max-w-full truncate">{item.relativeRoute}</span>
                    </td>
                    <td className="px-1 text-gray-300 whitespace-nowrap">{formatBytes(item.sizeBytes)}</td>
                    <td className="px-1 text-gray-300 font-mono">{formatChecksum(item.checksum)}</td>
                  </tr>
                );
              } else {
                // For empty cells, only show red background in the merge column if the file is missing there
                const isMergeColumn = selectedFolders[0]?.id === folder.id;
                return (
                  <tr key={route}>
                    <td className="text-right px-1 text-gray-500">{index + 1}</td>
                    <td 
                      colSpan={3} 
                      className={`px-1 ${isMergeColumn && missingInMergeColumn.has(route) ? 'bg-red-500/10' : ''}`}
                    ></td>
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

export default function MergePage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [selectedFolders, setSelectedFolders] = useState<Folder[]>([]);
  const [fileItemsMap, setFileItemsMap] = useState<Record<string, FileItem[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  const { unifiedFileRoutes, matchingChecksumRoutes, mismatchedChecksumRoutes, missingInMergeColumn } = useMemo((): { 
    unifiedFileRoutes: string[]; 
    matchingChecksumRoutes: Set<string>; 
    mismatchedChecksumRoutes: Set<string>;
    missingInMergeColumn: Set<string>;
  } => {
    const numSelectedFolders = selectedFolders.length;
    if (numSelectedFolders === 0) {
      return { 
        unifiedFileRoutes: [], 
        matchingChecksumRoutes: new Set(), 
        mismatchedChecksumRoutes: new Set(),
        missingInMergeColumn: new Set()
      };
    }

    // Get all unique file routes across all folders
    const allFileItems = Object.values(fileItemsMap).flat();
    const allRoutes = new Set(allFileItems.map(item => item.relativeRoute));
    const sortedRoutes = Array.from(allRoutes).sort((a, b) => a.localeCompare(b));

    const matchingChecksumRoutes = new Set<string>();
    const mismatchedChecksumRoutes = new Set<string>();
    const missingInMergeColumn = new Set<string>();

    // Get the first folder (Merge Column)
    const mergeFolderId = selectedFolders[0]?.id;
    const mergeFolderFiles = fileItemsMap[mergeFolderId] || [];
    const mergeFolderFileMap = new Map(mergeFolderFiles.map(item => [item.relativeRoute, item]));

    // Check each file in all folders
    for (const route of sortedRoutes) {
      const mergeColumnItem = mergeFolderFileMap.get(route);
      
      if (!mergeColumnItem) {
        // File doesn't exist in merge column but exists in other folders
        missingInMergeColumn.add(route);
        continue;
      }

      // File exists in merge column, now check other folders
      const otherFolders = selectedFolders.slice(1);
      const existsInOtherFolders = otherFolders.some(folder => {
        const folderFiles = fileItemsMap[folder.id] || [];
        return folderFiles.some(item => item.relativeRoute === route);
      });

      if (!existsInOtherFolders) {
        // File exists only in merge column
        matchingChecksumRoutes.add(route);
        continue;
      }

      // File exists in merge column and at least one other folder
      const allChecksums = new Set<string>();
      let allFoldersHaveFile = true;

      for (const folder of selectedFolders) {
        const folderFiles = fileItemsMap[folder.id] || [];
        const fileItem = folderFiles.find(item => item.relativeRoute === route);
        
        if (fileItem) {
          allChecksums.add(fileItem.checksum);
        } else {
          allFoldersHaveFile = false;
          break;
        }
      }

      if (allFoldersHaveFile) {
        if (allChecksums.size === 1) {
          // All files have the same checksum
          matchingChecksumRoutes.add(route);
        } else {
          // Files exist in all folders but checksums don't match
          mismatchedChecksumRoutes.add(route);
        }
      } else {
        // File exists in merge column and some other folders
        // Check if all files that exist have the same checksum
        const existingChecksums = new Set<string>();
        let allMatch = true;
        
        for (const folder of selectedFolders) {
          const folderFiles = fileItemsMap[folder.id] || [];
          const fileItem = folderFiles.find(item => item.relativeRoute === route);
          
          if (fileItem) {
            if (existingChecksums.size === 0) {
              existingChecksums.add(fileItem.checksum);
            } else if (!existingChecksums.has(fileItem.checksum)) {
              allMatch = false;
              break;
            }
          }
        }
        
        if (allMatch) {
          matchingChecksumRoutes.add(route);
        } else {
          mismatchedChecksumRoutes.add(route);
        }
      }
    }
    
    return { 
      unifiedFileRoutes: sortedRoutes, 
      matchingChecksumRoutes, 
      mismatchedChecksumRoutes,
      missingInMergeColumn
    };
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
      } finally {
        setIsLoading(false);
      }
    };
    fetchFolders();
  }, []);

  useEffect(() => {
    if (allFolders.length > 0) {
      const folderIdsFromUrl = searchParams.get('folders')?.split(',').filter(Boolean) || [];
      const currentSelectedIds = selectedFolders.map(f => f.id);

      if (JSON.stringify(folderIdsFromUrl) !== JSON.stringify(currentSelectedIds)) {
        const foldersToSelect = allFolders.filter(f => folderIdsFromUrl.includes(f.id));
        setSelectedFolders(foldersToSelect);
      }
    }
  }, [allFolders, searchParams, selectedFolders]);

  useEffect(() => {
    const fetchFileItems = async () => {
      const newFileItemsMap: Record<string, FileItem[]> = {};
      const promises = selectedFolders.map(async (folder) => {
        const items = await getFileItemsForFolder(folder.id);
        newFileItemsMap[folder.id] = items;
      });
      await Promise.all(promises);
      setFileItemsMap(newFileItemsMap);
    };
    fetchFileItems();
  }, [selectedFolders]);

  const updateUrlWithFolderIds = (folderIds: string[]) => {
    const newSearchParams = new URLSearchParams(searchParams.toString());
    if (folderIds.length > 0) {
      newSearchParams.set('folders', folderIds.join(','));
    } else {
      newSearchParams.delete('folders');
    }
    router.push(`${pathname}?${newSearchParams.toString()}`);
  };

  const handleAddFolder = (folderId: string) => {
    const folderToAdd = allFolders.find(f => f.id === folderId);
    if (folderToAdd) {
      const newSelectedFolders = [...selectedFolders, folderToAdd];
      setSelectedFolders(newSelectedFolders);
      
      const newFolderIds = newSelectedFolders.map(f => f.id);
      updateUrlWithFolderIds(newFolderIds);
    }
  };

  const handleRemoveFolder = (folderId: string) => {
    const newSelectedFolders = selectedFolders.filter(f => f.id !== folderId);
    setSelectedFolders(newSelectedFolders);
    
    // Update fileItemsMap to remove the deleted folder's files
    setFileItemsMap(prev => {
      const newFileItemsMap = { ...prev };
      delete newFileItemsMap[folderId];
      return newFileItemsMap;
    });
    
    updateUrlWithFolderIds(newSelectedFolders.map(f => f.id));
  };

  return (
    <div className="container-fluid mx-auto p-4">
      <Link href="/" className="text-blue-500 hover:underline mb-4 inline-block">
        &larr; Back to Folders
      </Link>
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Merge Folders</h1>
        <p className="text-gray-400">Select folders to merge their contents side-by-side.</p>
      </header>

      <AddFolderToMerge 
        allFolders={allFolders} 
        onAddFolder={handleAddFolder} 
        selectedFolderIds={selectedFolders.map(f => f.id)}
      />

      <main className="flex overflow-x-auto pb-4">
        {selectedFolders.map(folder => (
          <MergeFolderColumn
            key={folder.id}
            folder={folder}
            fileItems={fileItemsMap[folder.id] || []}
            unifiedFileRoutes={unifiedFileRoutes}
            matchingChecksumRoutes={matchingChecksumRoutes}
            mismatchedChecksumRoutes={mismatchedChecksumRoutes}
            missingInMergeColumn={missingInMergeColumn}
            selectedFolders={selectedFolders}
            onRemove={handleRemoveFolder}
          />
        ))}

        {selectedFolders.length === 0 && !isLoading && (
          <div className="w-full text-center py-16 bg-gray-800 rounded-lg border-2 border-dashed border-gray-700">
            <p className="text-gray-400">Search for and add folders to begin comparison.</p>
          </div>
        )}
      </main>
    </div>
  );
}
