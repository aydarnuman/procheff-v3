'use client';

import { useEffect, useRef, useState } from 'react';
import { AlertCircle, ExternalLink, Maximize2, Minimize2 } from 'lucide-react';

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
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [actualHeight, setActualHeight] = useState<number>(600);

  useEffect(() => {
    if (!iframeRef.current || !html) return;

    try {
      // Set srcdoc to render HTML content
      iframeRef.current.srcdoc = html;
      setLoadError(false);

      // Listen for iframe load to adjust height
      const handleLoad = () => {
        if (!iframeRef.current) return;

        try {
          // Try to get the actual content height
          const iframeDoc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
          if (iframeDoc) {
            const contentHeight = iframeDoc.documentElement.scrollHeight || iframeDoc.body.scrollHeight;
            setActualHeight(Math.min(contentHeight + 40, parseInt(maxHeight)));
          }
        } catch (e) {
          // Cross-origin error - use default height
          console.warn('Could not access iframe content height:', e);
        }
      };

      iframeRef.current.addEventListener('load', handleLoad);

      return () => {
        if (iframeRef.current) {
          iframeRef.current.removeEventListener('load', handleLoad);
        }
      };
    } catch (error) {
      console.error('Error setting iframe content:', error);
      setLoadError(true);
    }
  }, [html, maxHeight]);

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
        className={`
          bg-white rounded-b-lg border border-t-0 border-slate-700/50 overflow-hidden
          ${isFullscreen ? 'fixed inset-4 z-50 rounded-lg' : ''}
        `}
        style={{ height: isFullscreen ? 'calc(100vh - 32px)' : `${actualHeight}px` }}
      >
        <iframe
          ref={iframeRef}
          title={title}
          className="w-full h-full"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          style={{
            border: 'none',
            background: 'white',
            colorScheme: 'light'
          }}
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