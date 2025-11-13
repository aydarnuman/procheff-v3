/**
 * FloatingChatWidgetWrapper - Client Component wrapper for dynamic loading
 * Prevents SQLite from loading on client-side
 */

'use client';

import dynamic from 'next/dynamic';

// Dynamic import with no SSR to avoid SQLite client-side loading
const FloatingChatWidget = dynamic(
  () => import('./FloatingChatWidget').then((mod) => mod.FloatingChatWidget),
  {
    ssr: false,
    loading: () => null // No loading indicator needed
  }
);

export function FloatingChatWidgetWrapper() {
  return <FloatingChatWidget />;
}
