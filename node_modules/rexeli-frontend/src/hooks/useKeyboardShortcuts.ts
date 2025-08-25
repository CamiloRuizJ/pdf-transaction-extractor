import { useCallback, useEffect, useState } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: () => void;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const [isHelpVisible, setIsHelpVisible] = useState(false);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Show help with Ctrl+? or Cmd+?
    if ((event.ctrlKey || event.metaKey) && event.key === '?') {
      event.preventDefault();
      setIsHelpVisible(prev => !prev);
      return;
    }

    // Find matching shortcut
    const matchedShortcut = shortcuts.find(shortcut => {
      const keyMatch = shortcut.key.toLowerCase() === event.key.toLowerCase();
      const ctrlMatch = Boolean(shortcut.ctrlKey) === (event.ctrlKey || event.metaKey);
      const altMatch = Boolean(shortcut.altKey) === event.altKey;
      const shiftMatch = Boolean(shortcut.shiftKey) === event.shiftKey;

      return keyMatch && ctrlMatch && altMatch && shiftMatch;
    });

    if (matchedShortcut) {
      event.preventDefault();
      matchedShortcut.action();
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const closeHelp = useCallback(() => {
    setIsHelpVisible(false);
  }, []);

  // Keyboard shortcuts help modal component
  const KeyboardShortcutsHelp = () => {
    if (!isHelpVisible) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
          <div className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Keyboard Shortcuts</h2>
              <button
                onClick={closeHelp}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3">
              {shortcuts.map((shortcut, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">{shortcut.description}</span>
                  <div className="flex items-center space-x-1">
                    {shortcut.ctrlKey && (
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                        {navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}
                      </kbd>
                    )}
                    {shortcut.altKey && (
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                        Alt
                      </kbd>
                    )}
                    {shortcut.shiftKey && (
                      <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                        Shift
                      </kbd>
                    )}
                    <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">
                      {shortcut.key.toUpperCase()}
                    </kbd>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Press <kbd className="px-1 text-xs font-semibold bg-gray-100 border rounded">Esc</kbd> or click outside to close
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return {
    isHelpVisible,
    closeHelp,
    KeyboardShortcutsHelp,
  };
}