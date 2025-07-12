'use client';

interface ViewToggleProps {
  currentView: 'terminal' | 'chat';
  onViewChange: (view: 'terminal' | 'chat') => void;
}

export default function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex bg-mud-light border border-mud-green rounded-lg p-1">
      <button
        onClick={() => onViewChange('terminal')}
        className={`px-4 py-2 rounded-md font-mono text-sm transition-all ${
          currentView === 'terminal'
            ? 'bg-mud-green text-black'
            : 'text-mud-green hover:bg-mud-dark'
        }`}
      >
        Raw Terminal
      </button>
      <button
        onClick={() => onViewChange('chat')}
        className={`px-4 py-2 rounded-md font-mono text-sm transition-all ${
          currentView === 'chat'
            ? 'bg-mud-green text-black'
            : 'text-mud-green hover:bg-mud-dark'
        }`}
      >
        Parsed Chat
      </button>
    </div>
  );
}