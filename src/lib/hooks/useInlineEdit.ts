import { useState, useRef, useEffect, useCallback } from 'react';

interface UseInlineEditOptions {
  initialValue: string;
  onSave: (value: string) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
  selectOnFocus?: boolean;
}

interface UseInlineEditReturn {
  isEditing: boolean;
  value: string;
  inputRef: React.RefObject<HTMLInputElement | null>;
  startEditing: () => void;
  stopEditing: () => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  handleBlur: () => void;
}

/**
 * Inline Edit hook
 * Provides inline editing functionality with keyboard support
 *
 * @example
 * const {
 *   isEditing,
 *   value,
 *   inputRef,
 *   startEditing,
 *   handleChange,
 *   handleKeyDown,
 *   handleBlur
 * } = useInlineEdit({
 *   initialValue: item.name,
 *   onSave: (newName) => updateItem({ ...item, name: newName })
 * });
 */
export function useInlineEdit({
  initialValue,
  onSave,
  onCancel,
  autoFocus = true,
  selectOnFocus = true
}: UseInlineEditOptions): UseInlineEditReturn {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const originalValueRef = useRef(initialValue);

  // Update value when initialValue changes
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue);
      originalValueRef.current = initialValue;
    }
  }, [initialValue, isEditing]);

  // Auto-focus and select on edit start
  useEffect(() => {
    if (isEditing && inputRef.current) {
      if (autoFocus) {
        inputRef.current.focus();
      }
      if (selectOnFocus) {
        inputRef.current.select();
      }
    }
  }, [isEditing, autoFocus, selectOnFocus]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    originalValueRef.current = value;
  }, [value]);

  const stopEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const save = useCallback(() => {
    if (value.trim() !== originalValueRef.current) {
      onSave(value.trim());
    }
    stopEditing();
  }, [value, onSave, stopEditing]);

  const cancel = useCallback(() => {
    setValue(originalValueRef.current);
    stopEditing();
    onCancel?.();
  }, [onCancel, stopEditing]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    }
  }, [save, cancel]);

  const handleBlur = useCallback(() => {
    // Save on blur
    save();
  }, [save]);

  return {
    isEditing,
    value,
    inputRef,
    startEditing,
    stopEditing,
    handleChange,
    handleKeyDown,
    handleBlur
  };
}

/**
 * Inline Edit for numbers
 */
export function useInlineNumberEdit({
  initialValue,
  onSave,
  min,
  max,
  step = 1,
  decimals = 0
}: {
  initialValue: number;
  onSave: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  decimals?: number;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [displayValue, setDisplayValue] = useState(initialValue.toFixed(decimals));
  const inputRef = useRef<HTMLInputElement>(null);
  const originalValueRef = useRef(initialValue);

  useEffect(() => {
    if (!isEditing) {
      setDisplayValue(initialValue.toFixed(decimals));
      originalValueRef.current = initialValue;
    }
  }, [initialValue, isEditing, decimals]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const startEditing = useCallback(() => {
    setIsEditing(true);
    originalValueRef.current = initialValue;
  }, [initialValue]);

  const save = useCallback(() => {
    const numValue = parseFloat(displayValue);

    if (isNaN(numValue)) {
      setDisplayValue(originalValueRef.current.toFixed(decimals));
      setIsEditing(false);
      return;
    }

    let clampedValue = numValue;
    if (min !== undefined) clampedValue = Math.max(min, clampedValue);
    if (max !== undefined) clampedValue = Math.min(max, clampedValue);

    if (clampedValue !== originalValueRef.current) {
      onSave(clampedValue);
    }

    setDisplayValue(clampedValue.toFixed(decimals));
    setIsEditing(false);
  }, [displayValue, decimals, min, max, onSave]);

  const cancel = useCallback(() => {
    setDisplayValue(originalValueRef.current.toFixed(decimals));
    setIsEditing(false);
  }, [decimals]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      save();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancel();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const current = parseFloat(displayValue) || 0;
      setDisplayValue((current + step).toFixed(decimals));
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const current = parseFloat(displayValue) || 0;
      setDisplayValue((current - step).toFixed(decimals));
    }
  }, [displayValue, step, decimals, save, cancel]);

  return {
    isEditing,
    displayValue,
    inputRef,
    startEditing,
    handleChange,
    handleKeyDown,
    handleBlur: save
  };
}
