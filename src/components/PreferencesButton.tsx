import { Settings } from 'lucide-react';

interface PreferencesButtonProps {
  onClick: () => void;
}

export function PreferencesButton({ onClick }: PreferencesButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-lg text-navy-700/50 hover:text-amber-600 hover:bg-amber-50 transition-colors"
      title="Preferences"
      aria-label="Open preferences"
    >
      <Settings className="w-4 h-4" />
    </button>
  );
}
