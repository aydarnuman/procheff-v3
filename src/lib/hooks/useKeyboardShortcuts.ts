import { useEffect, useCallback } from 'react';

export type KeyCombo = string; // e.g., 'ctrl+s', 'cmd+k', 'ctrl+shift+p'

interface ShortcutConfig {
  key: KeyCombo;
  action: () => void;
  description?: string;
  preventDefault?: boolean;
}

/**
 * Keyboard Shortcuts hook
 * Register and manage keyboard shortcuts
 *
 * @example
 * useKeyboardShortcuts([
 *   { key: 'ctrl+s', action: handleSave, description: 'Kaydet' },
 *   { key: 'ctrl+1', action: () => setTab('data'), description: 'Veri sekmesi' },
 *   { key: 'ctrl+k', action: openSearch, description: 'Ara' }
 * ]);
 */
export function useKeyboardShortcuts(shortcuts: ShortcutConfig[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    for (const shortcut of shortcuts) {
      if (matchesShortcut(event, shortcut.key)) {
        if (shortcut.preventDefault !== false) {
          event.preventDefault();
        }
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

/**
 * Check if keyboard event matches shortcut pattern
 */
function matchesShortcut(event: KeyboardEvent, combo: KeyCombo): boolean {
  const parts = combo.toLowerCase().split('+');
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1);

  // Check key match
  const keyMatches = event.key.toLowerCase() === key || event.code.toLowerCase() === key.toLowerCase();
  if (!keyMatches) return false;

  // Check modifiers
  const hasCtrl = modifiers.includes('ctrl') || modifiers.includes('control');
  const hasShift = modifiers.includes('shift');
  const hasAlt = modifiers.includes('alt') || modifiers.includes('option');
  const hasMeta = modifiers.includes('cmd') || modifiers.includes('meta') || modifiers.includes('command');

  return (
    (!hasCtrl || event.ctrlKey) &&
    (!hasShift || event.shiftKey) &&
    (!hasAlt || event.altKey) &&
    (!hasMeta || event.metaKey)
  );
}

/**
 * Hook for displaying keyboard shortcut help
 */
export function useShortcutHelp(shortcuts: ShortcutConfig[]) {
  const formattedShortcuts = shortcuts.map(s => ({
    key: formatKeyCombo(s.key),
    description: s.description || ''
  }));

  return formattedShortcuts;
}

/**
 * Format key combo for display
 */
function formatKeyCombo(combo: KeyCombo): string {
  const parts = combo.split('+');
  return parts
    .map(part => {
      switch (part.toLowerCase()) {
        case 'ctrl':
        case 'control':
          return '⌃';
        case 'cmd':
        case 'meta':
        case 'command':
          return '⌘';
        case 'shift':
          return '⇧';
        case 'alt':
        case 'option':
          return '⌥';
        default:
          return part.toUpperCase();
      }
    })
    .join(' ');
}

/**
 * Common keyboard shortcuts presets
 */
export const commonShortcuts = {
  save: 'ctrl+s',
  undo: 'ctrl+z',
  redo: 'ctrl+shift+z',
  copy: 'ctrl+c',
  paste: 'ctrl+v',
  cut: 'ctrl+x',
  selectAll: 'ctrl+a',
  find: 'ctrl+f',
  commandPalette: 'ctrl+k',
  escape: 'escape',
  enter: 'enter',
  tab1: 'ctrl+1',
  tab2: 'ctrl+2',
  tab3: 'ctrl+3',
  tab4: 'ctrl+4',
  tab5: 'ctrl+5'
} as const;
