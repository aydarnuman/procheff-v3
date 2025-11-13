"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal, ChevronDown } from "lucide-react";

export interface LogEntry {
  timestamp: string;
  message: string;
  level: "info" | "success" | "warn" | "error";
}

interface LiveLogFeedProps {
  jobId: string;
  maxLogs?: number;
}

export function LiveLogFeed({ jobId, maxLogs = 10 }: LiveLogFeedProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to SSE for real-time logs
    const eventSource = new EventSource(
      `/api/orchestrate/stream?jobId=${jobId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        const newLog: LogEntry = {
          timestamp: new Date().toLocaleTimeString(),
          message: data.message || data.step || "Processing...",
          level: data.error
            ? "error"
            : data.step === "done"
              ? "success"
              : "info",
        };

        setLogs((prev) => {
          const updated = [...prev, newLog];
          // Keep only last N logs
          return updated.slice(-maxLogs);
        });
      } catch (error) {
        console.error("Failed to parse SSE message:", error);
      }
    };

    eventSource.onerror = () => {
      console.warn("SSE connection closed");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [jobId, maxLogs]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (isAutoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, isAutoScroll]);

  // Detect manual scroll
  const handleScroll = () => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;

    setIsAutoScroll(isAtBottom);
  };

  const levelColors = {
    info: "text-blue-400",
    success: "text-emerald-400",
    warn: "text-yellow-400",
    error: "text-red-400",
  };

  const levelBg = {
    info: "bg-blue-500/10 border-blue-500/20",
    success: "bg-emerald-500/10 border-emerald-500/20",
    warn: "bg-yellow-500/10 border-yellow-500/20",
    error: "bg-red-500/10 border-red-500/20",
  };

  return (
    <div className="relative h-full">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-3">
        <Terminal className="h-4 w-4 text-gray-400" />
        <h3 className="text-sm font-medium text-gray-300">Live Log Feed</h3>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-500">Live</span>
        </div>
      </div>

      {/* Logs Container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="h-[calc(100%-56px)] overflow-y-auto px-4 py-3 font-mono text-xs"
        // Dynamic scroll behavior based on state
        style={{
          scrollBehavior: isAutoScroll ? "smooth" : "auto",
        }}
      >
        <AnimatePresence initial={false}>
          {logs.map((log, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`mb-2 rounded-lg border p-2 ${levelBg[log.level]}`}
            >
              <div className="flex items-start gap-2">
                <span className="shrink-0 text-gray-500">
                  [{log.timestamp}]
                </span>
                <span className={levelColors[log.level]}>{log.message}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        <div ref={logsEndRef} />
      </div>

      {/* Auto-scroll indicator */}
      {!isAutoScroll && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={() => {
            setIsAutoScroll(true);
            logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute bottom-4 right-4 flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-lg hover:bg-indigo-700"
        >
          <ChevronDown className="h-3 w-3" />
          Scroll to bottom
        </motion.button>
      )}
    </div>
  );
}
