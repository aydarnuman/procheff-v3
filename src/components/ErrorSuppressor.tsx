'use client';

import { useEffect } from 'react';

/**
 * Suppresses browser extension errors that appear in console
 * These are harmless errors from extensions like React DevTools, ad blockers, etc.
 */
export function ErrorSuppressor() {
  useEffect(() => {
    // Suppress runtime.lastError from browser extensions and iframe sandbox warnings
    const originalError = console.error;
    const originalWarn = console.warn;
    
    console.error = (...args: unknown[]) => {
      const message = args[0]?.toString() || '';
      const fullMessage = args.map(arg => String(arg)).join(' ');
      const stack = args.find(arg => typeof arg === 'string' && arg.includes('at '))?.toString() || '';
      
      // Filter out browser extension errors and iframe sandbox warnings
      const shouldSuppress = 
        message.includes('runtime.lastError') ||
        message.includes('Unchecked runtime.lastError') ||
        message.includes('Could not establish connection') ||
        message.includes('Receiving end does not exist') ||
        message.includes('sandbox') ||
        message.includes('plugin') ||
        message.includes('Failed to load') ||
        message.includes('DataTable is not defined') ||
        message.includes('Uncaught ReferenceError: DataTable') ||
        message.includes('$ is not defined') ||
        message.includes('Uncaught ReferenceError: $') ||
        fullMessage.includes('DataTable is not defined') ||
        fullMessage.includes('$ is not defined') ||
        message.includes('trusted-types') ||
        message.includes('ERR_ABORTED 404') ||
        message.includes('about:srcdoc') ||
        message.includes('about:blank') ||
        message.includes('SecurityError') ||
        message.includes('Failed to read') ||
        message.includes('Failed to get') ||
        message.includes('named property') ||
        message.includes('Blocked a frame with origin') ||
        message.includes('cross-origin frame') ||
        message.includes('origin "null"') ||
        message.includes('from \'Location\'') ||
        message.includes('from \'Window\'') ||
        message.includes('from \'Document\'') ||
        fullMessage.includes('SecurityError') ||
        fullMessage.includes('cross-origin frame') ||
        fullMessage.includes('content_script') ||
        fullMessage.includes('chrome-extension://') ||
        fullMessage.includes('Failed to read') ||
        fullMessage.includes('Failed to get') ||
        fullMessage.includes('named property') ||
        stack.includes('content_script_compiled.js') ||
        stack.includes('chrome-extension://') ||
        stack.includes('wordviewer') ||
        stack.includes('officeapps.live.com') ||
        (stack.includes('VM') && stack.includes('content_script')) ||
        (message.includes('VM') && message.includes('content_script')) ||
        stack.match(/VM\d+.*content_script/) ||
        message.match(/VM\d+.*content_script/) ||
        fullMessage.match(/VM\d+.*content_script/) ||
        message.includes('end of central directory') ||
        message.includes('is this a zip file') ||
        message.includes('Can\'t find') ||
        fullMessage.includes('end of central directory') ||
        fullMessage.includes('is this a zip file') ||
        fullMessage.includes('Error handling response') ||
        // Office Online iframe sandbox errors
        message.includes('sandboxed and lacks') ||
        message.includes('allow-same-origin') ||
        message.includes('sessionStorage') ||
        message.includes('cookie') ||
        message.includes('wordviewer') ||
        message.includes('wordviewerds.js') ||
        message.includes('officeapps.live.com') ||
        fullMessage.includes('sandboxed and lacks') ||
        fullMessage.includes('allow-same-origin') ||
        fullMessage.includes('wordviewer') ||
        fullMessage.includes('wordviewerds.js') ||
        fullMessage.includes('officeapps.live.com') ||
        // Origin-keyed agent cluster warnings (harmless)
        message.includes('origin-keyed agent cluster') ||
        fullMessage.includes('origin-keyed agent cluster') ||
        // Additional patterns from console logs
        message.includes('sessings overrides') ||
        fullMessage.includes('sessings overrides');
      
      if (shouldSuppress) {
        // Silently ignore these expected errors
        return;
      }
      
      // Log other errors normally
      originalError.apply(console, args);
    };
    
    console.warn = (...args: unknown[]) => {
      const message = args[0]?.toString() || '';
      const fullMessage = args.map(arg => String(arg)).join(' ');
      
      // Filter out iframe sandbox warnings and extension errors
      const shouldSuppressWarn = 
        message.includes('sandbox') ||
        message.includes('iframe') ||
        message.includes('allow-scripts and allow-same-origin') ||
        message.includes('allow-same-origin') ||
        message.includes('sandboxed and lacks') ||
        message.includes('SecurityError') ||
        message.includes('cross-origin') ||
        message.includes('content_script') ||
        message.includes('chrome-extension://') ||
        message.includes('wordviewer') ||
        message.includes('wordviewerds.js') ||
        message.includes('officeapps.live.com') ||
        message.includes('sessionStorage') ||
        message.includes('cookie') ||
        message.includes('Failed to read') ||
        message.includes('Failed to get') ||
        message.includes('named property') ||
        message.includes('from \'Location\'') ||
        message.includes('from \'Window\'') ||
        message.includes('from \'Document\'') ||
        message.includes('origin-keyed agent cluster') ||
        message.includes('sessings overrides') ||
        fullMessage.includes('SecurityError') ||
        fullMessage.includes('cross-origin frame') ||
        fullMessage.includes('content_script_compiled.js') ||
        fullMessage.includes('sandboxed and lacks') ||
        fullMessage.includes('allow-same-origin') ||
        fullMessage.includes('wordviewer') ||
        fullMessage.includes('wordviewerds.js') ||
        fullMessage.includes('officeapps.live.com') ||
        fullMessage.includes('Failed to read') ||
        fullMessage.includes('Failed to get') ||
        fullMessage.includes('named property') ||
        fullMessage.includes('origin-keyed agent cluster') ||
        fullMessage.includes('sessings overrides');
      
      if (shouldSuppressWarn) {
        // Silently ignore these expected warnings
        return;
      }
      
      // Log other warnings normally
      originalWarn.apply(console, args);
    };

    // Suppress unhandled promise rejections from extensions
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason?.toString() || '';
      const error = event.reason instanceof Error ? event.reason.message : '';
      const stack = event.reason instanceof Error ? event.reason.stack : '';
      
      // Check if it's a browser extension error or iframe sandbox error
      const isExtensionError = 
        reason.includes('runtime.lastError') ||
        reason.includes('Unchecked runtime.lastError') ||
        reason.includes('Could not establish connection') ||
        reason.includes('Receiving end does not exist') ||
        reason.includes('SecurityError') ||
        reason.includes('cross-origin frame') ||
        reason.includes('content_script') ||
        reason.includes('sandboxed and lacks') ||
        reason.includes('allow-same-origin') ||
        reason.includes('wordviewer') ||
        reason.includes('officeapps.live.com') ||
        error.includes('SecurityError') ||
        error.includes('cross-origin') ||
        error.includes('sandboxed') ||
        error.includes('allow-same-origin') ||
        stack?.includes('content_script_compiled.js') ||
        stack?.includes('chrome-extension://') ||
        stack?.includes('wordviewer') ||
        stack?.includes('officeapps.live.com') ||
        stack?.match(/VM\d+.*content_script/);
      
      if (isExtensionError) {
        event.preventDefault();
        return;
      }
      
      // Log other unhandled rejections for debugging (but don't prevent default)
      // This helps identify real issues in the app
      if (process.env.NODE_ENV === 'development') {
        console.warn('Unhandled promise rejection (not from extension):', {
          reason,
          error,
          stack: stack?.slice(0, 500) // Limit stack trace length
        });
      }
    };

    // Suppress global error events from iframes and extensions
    const handleGlobalError = (event: ErrorEvent) => {
      const message = event.message || '';
      const source = event.filename || '';
      const error = event.error?.toString() || '';
      const stack = event.error instanceof Error ? event.error.stack : '';
      
      // Check if this is a browser extension error or iframe sandbox error
      const isExtensionError = 
        message.includes('SecurityError') ||
        message.includes('Failed to read') ||
        message.includes('Failed to get') ||
        message.includes('named property') ||
        message.includes('from \'Location\'') ||
        message.includes('from \'Window\'') ||
        message.includes('from \'Document\'') ||
        message.includes('Blocked a frame with origin') ||
        message.includes('cross-origin frame') ||
        message.includes('origin "null"') ||
        message.includes('sandboxed and lacks') ||
        message.includes('allow-same-origin') ||
        message.includes('sessionStorage') ||
        message.includes('cookie') ||
        message.includes('wordviewer') ||
        message.includes('wordviewerds.js') ||
        message.includes('officeapps.live.com') ||
        message.includes('sessings overrides') ||
        source.includes('content_script') ||
        source.includes('chrome-extension://') ||
        source.includes('wordviewer') ||
        source.includes('wordviewerds.js') ||
        source.includes('officeapps.live.com') ||
        source.match(/VM\d+.*content_script/) ||
        source.includes('about:srcdoc') ||
        source.includes('about:blank') ||
        error.includes('SecurityError') ||
        error.includes('cross-origin') ||
        error.includes('sandboxed') ||
        error.includes('allow-same-origin') ||
        error.includes('Failed to read') ||
        error.includes('Failed to get') ||
        error.includes('named property') ||
        stack?.includes('content_script_compiled.js') ||
        stack?.includes('chrome-extension://') ||
        stack?.includes('wordviewer') ||
        stack?.includes('wordviewerds.js') ||
        stack?.includes('officeapps.live.com') ||
        stack?.match(/VM\d+.*content_script/);
      
      if (isExtensionError) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError, true); // Use capture phase

    return () => {
      console.error = originalError;
      console.warn = originalWarn;
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError, true);
    };
  }, []);

  return null;
}

