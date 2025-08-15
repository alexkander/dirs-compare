import { getFolders, Folder } from "../lib/folderStore";
import AddFolderForm from "../components/AddFolderForm";

export default async function Home() {
  const folders: Folder[] = await getFolders();

  return (
    <div className="container mx-auto p-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Folder Sync Manager</h1>
        <p className="text-gray-500">A list of your configured folders.</p>
      </header>
      <main>
        <AddFolderForm />
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Sync</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {folders.length > 0 ? (
                folders.map((folder) => (
                  <tr key={folder.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{folder.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{folder.route}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{folder.lastSync ? folder.lastSync.toLocaleString() : 'Never'}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500">
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
