'use client';

import { useRef } from 'react';
import { createFolderAction } from '../app/actions';

export default function AddFolderForm() {
  const formRef = useRef<HTMLFormElement>(null);

  async function handleSubmit(formData: FormData) {
    const result = await createFolderAction(formData);
    if (result?.error) {
      alert(`Error: ${result.error}`);
    } else {
      formRef.current?.reset();
    }
  }

  return (
    <form ref={formRef} action={handleSubmit} className="flex items-center gap-4 mb-8">
      <input
        type="text"
        name="absoluteRoute"
        placeholder="Enter folder path"
        required
        className="border border-gray-300 rounded-md px-4 py-2 flex-grow focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        className="bg-blue-500 text-white font-bold py-2 px-4 rounded-md hover:bg-blue-600 transition-colors"
      >
        Add Folder
      </button>
    </form>
  );
}
