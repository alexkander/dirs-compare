import { getFolderById } from '@/lib/folderStore';
import { getDirectoryTree } from '@/lib/directoryScanner';
import { getSettings } from '@/lib/settingsStore';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import ExcludePatternsForm from '@/components/ExcludePatternsForm';

interface EditFolderPageProps {
  params: {
    id: string;
  };
}

export default async function EditFolderPage({ params }: EditFolderPageProps) {
  const folder = await getFolderById(params.id);

  if (!folder) {
    notFound();
  }

  const settings = getSettings();
  const directoryTree = await getDirectoryTree(folder.absoluteRoute, settings.globalExcludePatterns);

  return (
    <div className="container mx-auto p-8 text-white">
      <Link href="/" className="text-blue-400 hover:underline mb-8 block">&larr; Back to Folders</Link>
      <h1 className="text-2xl font-bold mb-4">Edit Folder: <span className="font-mono text-blue-400">{folder.absoluteRoute}</span></h1>
      <p className="mb-4 text-gray-400">Select directories to exclude from synchronization.</p>
      
      {directoryTree ? (
        <ExcludePatternsForm folder={folder} tree={directoryTree} />
      ) : (
        <div className="bg-red-900 border border-red-700 text-red-300 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error:</strong>
          <span className="block sm:inline"> Could not read the directory structure. Please check if the path is correct and accessible.</span>
        </div>
      )}
    </div>
  );
}
