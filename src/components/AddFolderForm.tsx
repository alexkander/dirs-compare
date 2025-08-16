'use client';

import { useRef } from 'react';
import { createFolderAction } from '../app/actions';

interface AddFolderFormProps {
  onFolderAdded?: () => Promise<void>;
}

export default function AddFolderForm({ onFolderAdded }: AddFolderFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    try {
      const result = await createFolderAction(formData);
      if (result?.error) {
        alert(`Error: ${result.error}`);
      } else {
        formRef.current?.reset();
        if (onFolderAdded) {
          await onFolderAdded();
        }
      }
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder. Please try again.');
    }
  }

  return (
    <div className="mb-8 p-4 bg-gray-800 border border-gray-700 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4 text-white">Add New Folder</h2>
      <form ref={formRef} action={handleSubmit} className="flex items-center gap-4">
        <input
          type="text"
          name="absoluteRoute"
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="/path/to/your/folder"
          required
        />
        <div className="flex items-center">
          <input
            id="add-subdirectories"
            name="addSubdirectories"
            type="checkbox"
            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label htmlFor="add-subdirectories" className="ml-2 block text-sm text-gray-300">
            agregar subdirectorios
          </label>
        </div>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-gray-500"
        >
          Add Folder
        </button>
      </form>
    </div>
  );
}
