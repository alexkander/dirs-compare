import Link from 'next/link';
import { getSettings } from '@/lib/settingsStore';
import SettingsForm from '@/components/SettingsForm';

export default function SettingsPage() {
  const settings = getSettings();

  return (
    <div className="container mx-auto p-8 text-white">
      <Link href="/" className="text-blue-400 hover:underline mb-8 block">&larr; Back to Folders</Link>
      <h1 className="text-2xl font-bold mb-4">Settings</h1>
      <SettingsForm settings={settings} />
    </div>
  );
}

