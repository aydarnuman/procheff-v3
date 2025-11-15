'use client';

import clsx from 'clsx';
import { AlertCircle, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import styles from './ReplicaFrame.module.css';

interface ReplicaFrameProps {
  html: string;
  title?: string;
  className?: string;
  maxHeight?: string;
}

export function ReplicaFrame({
  html,
  title = 'İhale Detayı',
  className = '',
  maxHeight = '800px'
}: ReplicaFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actualHeight, setActualHeight] = useState<number>(600);
  
  // Check if HTML contains PDF embeds or iframes that need plugins
  const hasPDFContent = html.includes('.pdf') || html.includes('application/pdf') || html.includes('pluginspage');

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !html) return;

    // Suppress iframe errors from browser extensions
    const suppressIframeErrors = (event: ErrorEvent) => {
      const message = event.message || '';
      const source = event.filename || '';
      const error = event.error?.toString() || '';
      const stack = event.error instanceof Error ? event.error.stack : '';
      
      // Check for VM pattern in source or stack
      const hasVMContentScript = 
        source.match(/VM\d+.*content_script/) ||
        stack?.match(/VM\d+.*content_script/) ||
        message.match(/VM\d+.*content_script/);
      
      // Suppress known browser extension errors
      if (
        message.includes('SecurityError') ||
        message.includes('Failed to read a named property') ||
        message.includes('Blocked a frame with origin') ||
        message.includes('cross-origin frame') ||
        message.includes('origin "null"') ||
        source.includes('content_script') ||
        source.includes('chrome-extension://') ||
        source.includes('about:srcdoc') ||
        source.includes('about:blank') ||
        error.includes('SecurityError') ||
        error.includes('cross-origin') ||
        message.includes('runtime.lastError') ||
        message.includes('Could not establish connection') ||
        message.includes('Error handling response') ||
        stack?.includes('content_script_compiled.js') ||
        stack?.includes('chrome-extension://') ||
        hasVMContentScript
      ) {
        event.preventDefault();
        event.stopPropagation();
        return true;
      }
      return false;
    };

    // Set srcdoc to render HTML content
    iframe.srcdoc = html;

    // Listen for iframe load to adjust height
    const handleLoad = () => {
      try {
        // Try to get the actual content height
        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
        if (iframeDoc) {
          const contentHeight = iframeDoc.documentElement.scrollHeight || iframeDoc.body.scrollHeight;
          const newHeight = Math.min(contentHeight + 40, parseInt(maxHeight));
          setActualHeight(newHeight);
          if (wrapperRef.current && !isFullscreen) {
            wrapperRef.current.style.height = `${newHeight}px`;
          }
          setLoadError(false);
        }
      } catch (error) {
        // Cross-origin error - use default height (suppress this warning)
        // Silently ignore - this is expected for srcdoc iframes
      }
    };

    // Suppress iframe errors
    const handleError = (event: ErrorEvent) => {
      suppressIframeErrors(event);
    };

    iframe.addEventListener('load', handleLoad);
    window.addEventListener('error', handleError, true); // Use capture phase

    return () => {
      iframe.removeEventListener('load', handleLoad);
      window.removeEventListener('error', handleError, true);
    };
  }, [html, maxHeight, isFullscreen]);

  useEffect(() => {
    if (!wrapperRef.current) return;
    if (isFullscreen) {
      wrapperRef.current.style.height = 'calc(100vh - 32px)';
    } else {
      wrapperRef.current.style.height = `${actualHeight}px`;
    }
  }, [isFullscreen, actualHeight]);

  const handleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleOpenInNewTab = () => {
    // Create a new window with the HTML content
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(html);
      newWindow.document.close();
    }
  };

  if (!html) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 text-slate-400">
          <AlertCircle className="w-5 h-5" />
          <span>HTML içeriği yükleniyor...</span>
        </div>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="glass-card p-6">
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          <span>İçerik yüklenirken hata oluştu</span>
        </div>
        <p className="text-sm text-slate-500 mt-2">
          Lütfen sayfayı yenileyip tekrar deneyin
        </p>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Toolbar */}
      <div className="glass bg-slate-800/50 rounded-t-lg border border-slate-700/50 p-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenInNewTab}
            className="p-1.5 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            title="Yeni sekmede aç"
          >
            <ExternalLink className="w-4 h-4" />
          </button>
          <button
            onClick={handleFullscreen}
            className="p-1.5 rounded-lg bg-slate-700/30 hover:bg-slate-700/50 text-slate-400 hover:text-slate-200 transition-colors"
            title={isFullscreen ? 'Normal görünüm' : 'Tam ekran'}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* iframe Container */}
      <div
        ref={wrapperRef}
        className={clsx(styles.wrapper, { [styles.fullscreen]: isFullscreen })}
      >
        <iframe
          ref={iframeRef}
          title={title}
          className={styles.frame}
          // Security: Use allow-scripts only for non-PDF content to avoid sandbox escape warning
          // For PDF content, we need allow-same-origin for plugins, but this creates a security warning
          // The warning is acceptable for trusted content from ihalebul.com
          // Note: allow-same-origin + allow-scripts together can escape sandbox, but we need it for PDF rendering
          sandbox={hasPDFContent 
            ? "allow-same-origin allow-scripts allow-popups allow-forms allow-modals allow-downloads"
            : "allow-scripts allow-popups allow-forms"
          }
        />
      </div>

      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div
          className="fixed inset-0 bg-black/50 z-40"
          onClick={handleFullscreen}
        />
      )}

      {/* Loading indicator */}
      <div className="absolute bottom-4 right-4 pointer-events-none">
        <div className="glass bg-slate-800/90 px-3 py-1.5 rounded-lg text-xs text-slate-300">
          Birebir Mod 🔒
        </div>
      </div>
    </div>
  );
}