'use client';

import { useState } from 'react';
import type { Folder } from '@/lib/folderStore';
import type { DirectoryNode } from '@/lib/directoryScanner';
import { updateExcludePatternsAction } from '@/app/folders/[id]/edit/actions';

interface ExcludePatternsFormProps {
  folder: Folder;
  tree: DirectoryNode;
}

interface TreeNodeProps {
  node: DirectoryNode;
  checkedPaths: Set<string>;
  onCheckboxChange: (path: string, isChecked: boolean) => void;
}

function TreeNode({ node, checkedPaths, onCheckboxChange }: TreeNodeProps) {
  const isChecked = checkedPaths.has(node.relativePath);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onCheckboxChange(node.relativePath, e.target.checked);
  };

  return (
    <div className="ml-6">
      <div className="flex items-center">
        <input
          type="checkbox"
          id={node.relativePath}
          checked={isChecked}
          onChange={handleCheckboxChange}
          className="mr-2"
        />
        <label htmlFor={node.relativePath}>{node.name}</label>
      </div>
      {!isChecked && node.children && node.children.length > 0 && (
        <div className="mt-1">
          {node.children.map(child => (
            <TreeNode key={child.relativePath} node={child} checkedPaths={checkedPaths} onCheckboxChange={onCheckboxChange} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExcludePatternsForm({ folder, tree }: ExcludePatternsFormProps) {
  const [checkedPaths, setCheckedPaths] = useState(new Set(folder.excludePatterns));
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCheckboxChange = (path: string, isChecked: boolean) => {
    setCheckedPaths(prev => {
      const newSet = new Set(prev);
      if (isChecked) {
        // Add the new path
        newSet.add(path);
        // Remove any children of this path that are already in the set
        for (const p of newSet) {
          if (p.startsWith(`${path}/`) && p !== path) {
            newSet.delete(p);
          }
        }
      } else {
        // Just remove the path
        newSet.delete(path);
      }
      return newSet;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    const result = await updateExcludePatternsAction(folder.id, Array.from(checkedPaths));
    setIsSubmitting(false);

    if (result.error) {
      alert(`Error: ${result.error}`);
    } else {
      alert('Exclude patterns updated successfully!');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        {tree.children && tree.children.map(child => (
          <TreeNode key={child.relativePath} node={child} checkedPaths={checkedPaths} onCheckboxChange={handleCheckboxChange} />
        ))}
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-500"
      >
        {isSubmitting ? 'Saving...' : 'Save Changes'}
      </button>
    </form>
  );
}
