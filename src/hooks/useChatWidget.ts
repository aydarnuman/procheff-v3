/**
 * useChatWidget Hook
 * Manages floating chat widget state (open/closed, minimized)
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatWidgetState {
  // State
  isOpen: boolean;
  isMinimized: boolean;
  unreadCount: number;

  // Actions
  open: () => void;
  close: () => void;
  toggle: () => void;
  minimize: () => void;
  maximize: () => void;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  clearUnread: () => void;
}

export const useChatWidget = create<ChatWidgetState>()(
  persist(
    (set) => ({
      // Initial state
      isOpen: false,
      isMinimized: false,
      unreadCount: 0,

      // Open chat panel
      open: () => set({ isOpen: true, isMinimized: false, unreadCount: 0 }),

      // Close chat panel
      close: () => set({ isOpen: false }),

      // Toggle open/closed
      toggle: () => set((state) => ({
        isOpen: !state.isOpen,
        unreadCount: !state.isOpen ? 0 : state.unreadCount // Clear unread when opening
      })),

      // Minimize panel
      minimize: () => set({ isMinimized: true }),

      // Maximize panel
      maximize: () => set({ isMinimized: false }),

      // Set unread count
      setUnreadCount: (count) => set({ unreadCount: count }),

      // Increment unread count
      incrementUnread: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),

      // Clear unread count
      clearUnread: () => set({ unreadCount: 0 })
    }),
    {
      name: 'chat-widget-store',
      partialize: (state) => ({
        // Only persist isOpen state
        isOpen: state.isOpen
      })
    }
  )
);
