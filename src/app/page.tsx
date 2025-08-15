import { getFolders, Folder } from "../lib/folderStore";
import AddFolderForm from "../components/AddFolderForm";
import { formatBytes } from "../lib/formatters";

export default async function Home() {
  const folders: Folder[] = await getFolders();

  return (
    <div className="container mx-auto p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Folder Sync Manager</h1>
        <p className="text-gray-400">A list of your configured folders.</p>
        </div>
        <a href="/settings" className="px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-600 transition-colors">Settings</a>
      </header>
      <main>
        <AddFolderForm />
        <div className="overflow-x-auto">
          <table className="min-w-full bg-gray-800 border border-gray-700">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Absolute Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Last Sync</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Total Size</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Files</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Excluded Patterns</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <tr key={folder.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-100">{folder.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.absoluteRoute}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.lastSync?.toLocaleString() ?? ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{formatBytes(folder.totalBytes)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{folder.countFiles?.toLocaleString() ?? ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">
                      <div className="max-w-xs overflow-hidden text-ellipsis whitespace-nowrap" title={folder.excludePatterns.join(', ')}>
                        {folder.excludePatterns.join(', ')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <a href={`/folders/${folder.id}/edit`} className="text-blue-500 hover:underline">Exclusion</a>
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
