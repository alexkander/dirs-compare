'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { FileItem } from '../../../lib/fileItemStore';
import { formatBytes } from '../../../lib/formatters';

import { useEffect, useState, useCallback } from 'react';

export default function FolderFilesPage() {
  const params = useParams();
  const folderId = params.id as string;
  const [fileItems, setFileItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  const fetchFileItems = useCallback(async () => {
    if (folderId) {
      setLoading(true);
      try {
        const response = await fetch(`/api/folders/${folderId}/files`);
        if (!response.ok) {
          throw new Error('Failed to fetch file items');
        }
        const data = await response.json();
        setFileItems(data);
      } catch (error) {
        console.error('Error fetching file items:', error);
      } finally {
        setLoading(false);
      }
    }
  }, [folderId]);

  useEffect(() => {
    fetchFileItems();
  }, [fetchFileItems]);

  const handleSync = async () => {
    if (!folderId) return;
    setIsSyncing(true);
    try {
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      if (!response.ok) throw new Error('Sync failed');
      await fetchFileItems(); // Re-fetch files to show updated list
    } catch (error) {
      console.error('An error occurred during sync:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Files in Folder {folderId}</h1>
          <button
            onClick={handleSync}
            disabled={isSyncing || loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md shadow-md hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed transition-colors duration-200"
          >
            {isSyncing ? 'Syncing...' : 'Sync Folder'}
          </button>
        </div>
        <Link href="/" className="text-blue-500 hover:underline">
          &larr; Back to Folders
        </Link>
      </div>

      {loading ? (
        <p className="text-center text-gray-400">Loading files...</p>
      ) : fileItems.length === 0 ? (
        <p className="text-center text-gray-400">No files found. Try syncing the folder.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 border border-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">File Path</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {fileItems.map((file) => (
                <tr key={file.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400 font-mono">{file.relativeRoute}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatBytes(file.sizeBytes)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{new Date(file.lastSync).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
