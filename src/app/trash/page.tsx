'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TrashedFolder } from '@/lib/trashStore';
import { formatBytes } from '@/lib/formatters';

export default function TrashPage() {
  const [trashedFolders, setTrashedFolders] = useState<TrashedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadTrashedFolders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/trash');
        
        if (!response.ok) {
          throw new Error('Failed to load trashed folders');
        }
        
        const folders = await response.json();
        setTrashedFolders(folders);
      } catch (err) {
        console.error('Error loading trashed folders:', err);
        setError('Failed to load trashed folders');
      } finally {
        setLoading(false);
      }
    };

    loadTrashedFolders();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="container-fluid mx-auto p-8">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Trash</h1>
          <p className="text-gray-400">View and manage deleted folders</p>
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
        ) : trashedFolders.length === 0 ? (
          <div className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center">
            <p className="text-gray-400">No items in trash</p>
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
                    Deleted
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
                {trashedFolders.map((folder) => (
                  <tr key={folder.id} className="hover:bg-gray-750">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white">{folder.name}</span>
                        {folder.merging && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                            merge
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{folder.absoluteRoute}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatDate(folder.deletedAt)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatBytes(folder.totalBytes)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{folder.countFiles != null ? folder.countFiles.toLocaleString() : ''}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleRestore(folder.id)}
                        className="text-blue-400 hover:text-blue-300 mr-4"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => handleDelete(folder.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        Delete Permanently
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
      const response = await fetch('/api/trash', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore folder');
      }

      // Refresh the list after successful restore
      setTrashedFolders(prev => prev.filter(folder => folder.id !== folderId));
      alert('Folder restored successfully');
    } catch (error) {
      console.error('Error restoring folder:', error);
      alert(`Failed to restore folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async function handleDelete(folderId: string) {
    if (!window.confirm('Are you sure you want to permanently delete this folder? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`/api/trash?id=${encodeURIComponent(folderId)}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete folder');
      }

      // Remove the folder from the list after successful deletion
      setTrashedFolders(prev => prev.filter(folder => folder.id !== folderId));
      alert('Folder permanently deleted');
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert(`Failed to delete folder: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
