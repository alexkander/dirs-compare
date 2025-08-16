'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArchivedFolder } from '@/lib/archiveStore';

export default function ArchivePage() {
  const [archivedFolders, setArchivedFolders] = useState<ArchivedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadArchivedFolders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/archive');
        
        if (!response.ok) {
          throw new Error('Failed to load archived folders');
        }
        
        const folders = await response.json();
        setArchivedFolders(folders);
      } catch (err) {
        console.error('Error loading archived folders:', err);
        setError('Failed to load archived folders');
      } finally {
        setLoading(false);
      }
    };

    loadArchivedFolders();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="container mx-auto p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Archive</h1>
          <p className="text-gray-400">View and manage archived folders</p>
        </div>
        <Link 
          href="/" 
          className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors"
        >
          Back to Folders
        </Link>
      </header>

      <main>
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded relative" role="alert">
            <strong className="font-bold">Error: </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        ) : archivedFolders.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
            <p className="text-gray-400">No archived folders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-gray-800 border border-gray-700">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Original Location
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Archived At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Files
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {archivedFolders.map((folder) => (
                  <tr key={folder.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{folder.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{folder.originalPath}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatDate(folder.archivedAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatFileSize(folder.size)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{folder.fileCount}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRestore(folder.id)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Restore
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );

  async function handleRestore(folderId: string) {
    try {
      const response = await fetch('/api/archive', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore folder from archive');
      }

      // Refresh the list after successful restore
      setArchivedFolders(prev => prev.filter(folder => folder.id !== folderId));
      alert('Folder restored successfully');
    } catch (error) {
      console.error('Error restoring folder:', error);
      alert(`Failed to restore folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
