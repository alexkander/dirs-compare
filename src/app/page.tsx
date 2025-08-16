'use client';

import Link from 'next/link';
import path from 'path';
import { useEffect, useMemo, useState } from 'react';
import { Folder } from '../lib/folderStore';
import { formatBytes, formatChecksum } from '../lib/formatters';

import AddFolderForm from '../components/AddFolderForm';

export default function Home() {
  const [folders, setFolders] = useState<Folder[]>([]);
    const [syncingFolderId, setSyncingFolderId] = useState<string | null>(null);
  const [deletingFolderId, setDeletingFolderId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Folder | 'name' | 'path'; direction: 'ascending' | 'descending' } | null>(null);

  const sortedFolders = useMemo(() => {
    const sortableItems = [...folders];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        // Using any for generic sort function
        let aValue: string | number | Date | string[] | null | undefined;
        let bValue: string | number | Date | string[] | null | undefined;

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

        if (aValue == null) return 1;
        if (bValue == null) return -1;

        // Handle array comparison by converting to string
        if (Array.isArray(aValue)) aValue = aValue.join(', ');
        if (Array.isArray(bValue)) bValue = bValue.join(', ');

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [folders, sortConfig]);

  const requestSort = (key: keyof Folder | 'name' | 'path') => {
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
    <div className="container mx-auto p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Folder Sync Manager</h1>
          <p className="text-gray-400">A list of your configured folders.</p>
        </div>
        <div className="flex items-center space-x-4">
          <Link href="/compare" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors">
            Comparar
          </Link>
          <Link href="/settings" className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors">
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
                      <Link href={`/folders/${folder.id}`} className="text-blue-400 hover:underline">
                        {path.basename(folder.absoluteRoute)}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      {path.dirname(folder.absoluteRoute)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.lastSync?.toLocaleString() ?? ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatBytes(folder.totalBytes)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.countFiles != null ? folder.countFiles.toLocaleString() : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">{formatChecksum(folder.checksum)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-4">
                      <button
                        onClick={() => handleSync(folder.id)}
                        disabled={syncingFolderId === folder.id}
                        className="text-green-500 hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        {syncingFolderId === folder.id ? 'Syncing...' : 'Sync'}
                      </button>
                                            <Link href={`/folders/${folder.id}/edit`} className="text-blue-500 hover:underline">Exclusion</Link>
                      <button
                        onClick={() => handleDelete(folder.id)}
                        disabled={deletingFolderId === folder.id}
                        className="text-red-500 hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        {deletingFolderId === folder.id ? 'Deleting...' : 'Delete'}
                      </button>
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
