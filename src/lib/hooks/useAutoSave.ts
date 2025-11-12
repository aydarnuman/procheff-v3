import { useEffect, useRef, useState, useCallback } from 'react';

interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T) => Promise<void> | void;
  interval?: number; // milliseconds
  enabled?: boolean;
  debounce?: number; // debounce changes before saving
}

interface UseAutoSaveReturn {
  isSaving: boolean;
  lastSaved: Date | null;
  error: Error | null;
  forceSave: () => Promise<void>;
}

/**
 * Auto-save hook
 * Automatically saves data at regular intervals with debouncing
 *
 * @example
 * const { isSaving, lastSaved, forceSave } = useAutoSave({
 *   data: proposalData,
 *   onSave: async (data) => { await saveProposal(data); },
 *   interval: 3000, // 3 seconds
 *   debounce: 1000
 * });
 */
export function useAutoSave<T>({
  data,
  onSave,
  interval = 3000,
  enabled = true,
  debounce = 1000
}: UseAutoSaveOptions<T>): UseAutoSaveReturn {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const dataRef = useRef(data);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const hasChangesRef = useRef(false);

  // Track data changes
  useEffect(() => {
    if (JSON.stringify(dataRef.current) !== JSON.stringify(data)) {
      dataRef.current = data;
      hasChangesRef.current = true;

      // Clear existing debounce timer
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      // Set new debounce timer
      if (enabled && debounce > 0) {
        debounceRef.current = setTimeout(() => {
          hasChangesRef.current = true;
        }, debounce);
      }
    }
  }, [data, enabled, debounce]);

  // Save function
  const save = useCallback(async () => {
    if (!hasChangesRef.current || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      await onSave(dataRef.current);
      setLastSaved(new Date());
      hasChangesRef.current = false;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Save failed'));
      console.error('Auto-save error:', err);
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, onSave]);

  // Force save
  const forceSave = useCallback(async () => {
    hasChangesRef.current = true;
    await save();
  }, [save]);

  // Auto-save interval
  useEffect(() => {
    if (!enabled) return;

    timeoutRef.current = setInterval(() => {
      save();
    }, interval);

    return () => {
      if (timeoutRef.current) {
        clearInterval(timeoutRef.current);
      }
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [enabled, interval, save]);

  return {
    isSaving,
    lastSaved,
    error,
    forceSave
  };
}

/**
 * Auto-save indicator component hook
 * Returns formatted status message
 */
export function useAutoSaveStatus(lastSaved: Date | null, isSaving: boolean): string {
  const [status, setStatus] = useState('');

  useEffect(() => {
    if (isSaving) {
      setStatus('Kaydediliyor...');
      return;
    }

    if (!lastSaved) {
      setStatus('Henüz kaydedilmedi');
      return;
    }

    const updateStatus = () => {
      const now = new Date();
      const diff = now.getTime() - lastSaved.getTime();
      const seconds = Math.floor(diff / 1000);

      if (seconds < 5) {
        setStatus('Az önce kaydedildi');
      } else if (seconds < 60) {
        setStatus(`${seconds} saniye önce kaydedildi`);
      } else {
        const minutes = Math.floor(seconds / 60);
        setStatus(`${minutes} dakika önce kaydedildi`);
      }
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [lastSaved, isSaving]);

  return status;
}
