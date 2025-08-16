'use client';

import Link from 'next/link';
import path from 'path';
import { useEffect, useMemo, useState } from 'react';
import { Folder } from '../lib/folderStore';
import { formatBytes, formatChecksum } from '../lib/formatters';
import AddFolderForm from '../components/AddFolderForm';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [syncingFolderId, setSyncingFolderId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [movingToTrashId, setMovingToTrashId] = useState<string | null>(null);
  const [movingToArchiveId, setMovingToArchiveId] = useState<string | null>(null);
  type SortableKey = keyof Omit<Folder, 'merging'> | 'name' | 'path';
  const [sortConfig, setSortConfig] = useState<{ key: SortableKey; direction: 'ascending' | 'descending' } | null>(null);

  const sortedFolders = useMemo(() => {
    const sortableItems = [...folders];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue: string | number | Date | string[] | boolean | null | undefined;
        let bValue: string | number | Date | string[] | boolean | null | undefined;

        if (sortConfig.key === 'name') {
          aValue = path.basename(a.absoluteRoute);
          bValue = path.basename(b.absoluteRoute);
        } else if (sortConfig.key === 'path') {
          aValue = path.dirname(a.absoluteRoute);
          bValue = path.dirname(b.absoluteRoute);
        } else {
          aValue = a[sortConfig.key as keyof Folder];
          bValue = b[sortConfig.key as keyof Folder];
        }

        // Handle null/undefined values
        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Handle array comparison by converting to string
        if (Array.isArray(aValue)) aValue = aValue.join(', ');
        if (Array.isArray(bValue)) bValue = bValue.join(', ');

        // Convert values to strings for comparison
        const aStr = String(aValue);
        const bStr = String(bValue);

        if (aStr < bStr) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aStr > bStr) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [folders, sortConfig]);

  const requestSort = (key: SortableKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const fetchFolders = async () => {
    try {
      const response = await fetch('/api/folders');
      if (!response.ok) {
        throw new Error('Failed to fetch folders');
      }
      const fetchedFolders = await response.json();
      setFolders(fetchedFolders);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  };

  useEffect(() => {
    fetchFolders();
  }, []);

  const handleDelete = async (folderId: string) => {
    if (window.confirm('Are you sure you want to delete this folder and all its associated files? This action cannot be undone.')) {
      setDeletingFolderId(folderId);
      try {
        const response = await fetch(`/api/folders/${folderId}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          let errorMessage = 'Failed to delete folder';
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            try {
              const errorData = await response.json();
              errorMessage = errorData.details || errorData.error || errorMessage;
            } catch {
              errorMessage = `Failed to parse error response: ${response.statusText}`;
            }
          } else {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        await fetchFolders(); // Refresh folder data after delete
      } catch (error) {
        console.error('An error occurred during deletion:', error);
        alert(`Deletion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setDeletingFolderId(null);
      }
    }
  };

  const handleMoveToTrash = async (folderId: string) => {
    if (window.confirm('Are you sure you want to move this folder to trash? The folder will be moved to the trash directory instead of being deleted permanently.')) {
      setMovingToTrashId(folderId);
      try {
        const response = await fetch('/api/trash', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to move folder to trash');
        }
        
        await fetchFolders(); // Refresh folder data after moving to trash
        alert('Folder moved to trash successfully');
      } catch (error) {
        console.error('An error occurred while moving to trash:', error);
        alert(`Failed to move to trash: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setMovingToTrashId(null);
      }
    }
  };

  const handleMoveToArchive = async (folderId: string) => {
    if (window.confirm('Are you sure you want to move this folder to archive? The folder will be moved to the archive directory for long-term storage.')) {
      setMovingToArchiveId(folderId);
      try {
        const response = await fetch('/api/archive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to move folder to archive');
        }
        
        await fetchFolders(); // Refresh folder data after moving to archive
        alert('Folder moved to archive successfully');
      } catch (error) {
        console.error('An error occurred while moving to archive:', error);
        alert(`Failed to move to archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setMovingToArchiveId(null);
      }
    }
  };

  const handleMerge = (folder: Folder) => {
    // Find all folders with the same name as the clicked folder
    const folderName = path.basename(folder.absoluteRoute);
    const matchingFolders = folders.filter(f => 
      path.basename(f.absoluteRoute) === folderName && f.id !== folder.id
    );

    if (matchingFolders.length === 0) {
      alert('No other folders with the same name found to merge with.');
      return;
    }

    // Create a comma-separated list of folder IDs, with the clicked folder first
    const folderIds = [folder.id, ...matchingFolders.map(f => f.id)];
    router.push(`/merge?folders=${folderIds.join(',')}`);
  };

  const handleSync = async (folderId: string) => {
    setSyncingFolderId(folderId);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Sync failed');
      }
      await fetchFolders(); // Refresh folder data after sync
    } catch (error) {
      console.error('An error occurred during sync:', error);
      alert(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSyncingFolderId(null);
    }
  };

  return (
    <div className="container-fluid mx-auto p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Folder Sync Manager</h1>
          <p className="text-gray-400">A list of your configured folders.</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/merge" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors">
            Merge
          </Link>
          <Link 
            href="/trash" 
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Trash
          </Link>
          <Link 
            href="/archive" 
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 3a2 2 0 100 4h12a2 2 0 100-4H4z" />
              <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
            </svg>
            Archive
          </Link>
          <Link 
            href="/settings" 
            className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
            </svg>
            Settings
          </Link>
        </div>
      </header>

      <main>
        <AddFolderForm onFolderAdded={fetchFolders} />
        <div className="overflow-x-auto mt-8">
          <table className="min-w-full bg-gray-800 border border-gray-700">
                        <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('name')}>
                  Name {sortConfig?.key === 'name' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('path')}>
                  Path {sortConfig?.key === 'path' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('lastSync')}>
                  Last Sync {sortConfig?.key === 'lastSync' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('totalBytes')}>
                  Total Size {sortConfig?.key === 'totalBytes' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => requestSort('countFiles')}>
                  Files {sortConfig?.key === 'countFiles' && (sortConfig.direction === 'ascending' ? '▲' : '▼')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer">
                  Checksum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {folders.length > 0 ? (
                sortedFolders.map((folder) => (
                  <tr key={folder.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="flex items-center space-x-2">
                        <Link href={`/folders/${folder.id}`} className="text-blue-400 hover:underline">
                          {path.basename(folder.absoluteRoute)}
                        </Link>
                        {folder.merging && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                            merge
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {path.dirname(folder.absoluteRoute)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.lastSync?.toLocaleString() ?? ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatBytes(folder.totalBytes)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.countFiles != null ? folder.countFiles.toLocaleString() : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">{formatChecksum(folder.checksum)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-4">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMerge(folder);
                          }}
                          className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Merge
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSync(folder.id);
                          }}
                          disabled={syncingFolderId === folder.id}
                          className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
                        >
                          {syncingFolderId === folder.id ? 'Syncing...' : 'Sync'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToArchive(folder.id);
                          }}
                          disabled={movingToArchiveId === folder.id}
                          className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:bg-indigo-400"
                        >
                          {movingToArchiveId === folder.id ? 'Moving...' : 'Archive'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveToTrash(folder.id);
                          }}
                          disabled={movingToTrashId === folder.id}
                          className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:bg-yellow-400"
                        >
                          {movingToTrashId === folder.id ? 'Moving...' : 'Trash'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(folder.id);
                          }}
                          disabled={deletingFolderId === folder.id}
                          className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 disabled:bg-red-400"
                        >
                          {deletingFolderId === folder.id ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-400">
                    No folders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
