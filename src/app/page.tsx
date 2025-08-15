'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Folder } from '../lib/folderStore';
import { formatBytes } from '../lib/formatters';
import AddFolderForm from '../components/AddFolderForm';

export default function Home() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [syncingFolderId, setSyncingFolderId] = useState<string | null>(null);

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
        <Link href="/settings" className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors">Settings</Link>
      </header>

      <main>
        <AddFolderForm />
        <div className="overflow-x-auto mt-8">
          <table className="min-w-full bg-gray-800 border border-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Path</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Files</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Exclude Patterns</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <tr key={folder.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <Link href={`/folders/${folder.id}`} className="text-blue-400 hover:underline">
                        {folder.absoluteRoute}
                      </Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.lastSync?.toLocaleString() ?? ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.totalBytes != null ? formatBytes(folder.totalBytes) : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.countFiles != null ? folder.countFiles.toLocaleString() : ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={folder.excludePatterns.join(', ')}>
                        {folder.excludePatterns.join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm space-x-4">
                      <button
                        onClick={() => handleSync(folder.id)}
                        disabled={syncingFolderId === folder.id}
                        className="text-green-500 hover:underline disabled:text-gray-500 disabled:cursor-not-allowed"
                      >
                        {syncingFolderId === folder.id ? 'Syncing...' : 'Sync'}
                      </button>
                      <Link href={`/folders/${folder.id}/edit`} className="text-blue-500 hover:underline">Exclusion</Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-400">
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
