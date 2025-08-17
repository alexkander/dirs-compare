'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArchivedFolder } from '@/lib/archiveStore';
import { formatBytes } from '@/lib/formatters';

export default function ArchivePage() {
  const [archivedFolders, setArchivedFolders] = useState<ArchivedFolder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof ArchivedFolder; direction: 'asc' | 'desc' }>({ 
    key: 'archivedAt', 
    direction: 'desc' 
  });

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

  const requestSort = (key: keyof ArchivedFolder) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedFolders = () => {
    if (!archivedFolders.length) return [];
    
    return [...archivedFolders].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Handle potential undefined values
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      // Convert to string for consistent comparison
      if (typeof aValue !== 'string') aValue = String(aValue);
      if (typeof bValue !== 'string') bValue = String(bValue);

      // For date fields, convert to timestamps for proper comparison
      if (sortConfig.key === 'archivedAt') {
        aValue = new Date(aValue as string).getTime().toString();
        bValue = new Date(bValue as string).getTime().toString();
      }

      // For numeric fields, convert to numbers for proper comparison
      if (sortConfig.key === 'totalBytes' || sortConfig.key === 'countFiles') {
        aValue = (a[sortConfig.key] || 0).toString();
        bValue = (b[sortConfig.key] || 0).toString();
        
        // If we're sorting by size or file count, convert to numbers
        const numA = parseFloat(aValue);
        const numB = parseFloat(bValue);
        return sortConfig.direction === 'asc' ? numA - numB : numB - numA;
      }

      // Default string comparison
      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  const getSortIndicator = (key: keyof ArchivedFolder) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="container-fluid mx-auto p-8">
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
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => requestSort('name')}
                  >
                    Name{getSortIndicator('name')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => requestSort('absoluteRoute')}
                  >
                    Original Location{getSortIndicator('absoluteRoute')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => requestSort('archivedAt')}
                  >
                    Archived At{getSortIndicator('archivedAt')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => requestSort('totalBytes')}
                  >
                    Size{getSortIndicator('totalBytes')}
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-600"
                    onClick={() => requestSort('countFiles')}
                  >
                    Files{getSortIndicator('countFiles')}
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {getSortedFolders().map((folder) => (
                  <tr key={folder.id} className="hover:bg-gray-700/50">
                    <td className="px-2 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-white">{folder.name}</span>
                        {folder.merging && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-900 text-green-300">
                            merge
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 whitespace-nowrap">
                      <div className="text-sm text-gray-300 max-w-xs truncate overflow-hidden" title={folder.absoluteRoute}>
                        <span className="inline-block max-w-full truncate">{folder.absoluteRoute}</span>
                      </div>
                    </td>
                    <td className="px-2 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatDate(folder.archivedAt)}</div>
                    </td>
                    <td className="px-2 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{formatBytes(folder.totalBytes)}</div>
                    </td>
                    <td className="px-2 whitespace-nowrap">
                      <div className="text-sm text-gray-300">{folder.countFiles != null ? folder.countFiles.toLocaleString() : ''}</div>
                    </td>
                    <td className="px-2 whitespace-nowrap text-right text-sm font-medium">
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
