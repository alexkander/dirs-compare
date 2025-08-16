'use client';

import { useState } from 'react';
import { Settings } from '@/lib/settingsStore';
import { updateSettingsAction } from '@/app/settings/actions';

interface SettingsFormProps {
  settings: Settings;
}

export default function SettingsForm({ settings }: SettingsFormProps) {
  const [patterns, setPatterns] = useState(settings.globalExcludePatterns);
  const [trashDirectory, setTrashDirectory] = useState(settings.trashDirectory);
  const [newPattern, setNewPattern] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAddPattern = () => {
    if (newPattern && !patterns.includes(newPattern)) {
      const updatedPatterns = [...patterns, newPattern];
      setPatterns(updatedPatterns);
      setNewPattern('');
    }
  };

  const handleRemovePattern = (patternToRemove: string) => {
    const updatedPatterns = patterns.filter(p => p !== patternToRemove);
    setPatterns(updatedPatterns);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await updateSettingsAction({
      globalExcludePatterns: patterns,
      trashDirectory,
    });
    setIsSubmitting(false);
    if (result?.error) {
      alert(`Error: ${result.error}`);
    } else {
      // Show success message
      alert('Settings saved successfully!');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg border border-gray-700">
      <h2 className="text-xl font-semibold mb-4 text-white">Global Settings</h2>
      
      <div className="mb-6">
        <label htmlFor="trash-directory" className="block text-sm font-medium text-gray-300 mb-2">
          Trash Directory
        </label>
        <input
          type="text"
          id="trash-directory"
          value={trashDirectory}
          onChange={(e) => setTrashDirectory(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 mb-4"
          placeholder="./.trash"
        />
        <p className="text-xs text-gray-400">
          Directory where deleted files will be moved to instead of being permanently deleted.
        </p>
      </div>

      <h3 className="text-lg font-medium text-white mb-3">Global Exclude Patterns</h3>
      
      <div className="mb-4">
        {patterns.map(pattern => (
          <div key={pattern} className="flex items-center justify-between bg-gray-700 p-2 rounded-md mb-2">
            <span className="font-mono text-gray-300">{pattern}</span>
            <button 
              type="button"
              onClick={() => handleRemovePattern(pattern)}
              className="text-red-400 hover:text-red-300 font-bold"
            >
              &times;
            </button>
          </div>
        ))}
        {patterns.length === 0 && <p className="text-gray-500">No global patterns defined.</p>}
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Add a new pattern (e.g., *.log)"
        />
        <button 
          type="button"
          onClick={handleAddPattern}
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-500"
        >
          Add
        </button>
      </div>

      <button 
        type="submit"
        disabled={isSubmitting}
        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500"
      >
        {isSubmitting ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}
