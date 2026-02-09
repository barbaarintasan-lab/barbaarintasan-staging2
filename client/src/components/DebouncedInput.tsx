import { useState, useEffect, useRef, useCallback, memo, ChangeEvent, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface DebouncedInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
}

interface DebouncedTextareaProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  value: string;
  onChange: (value: string) => void;
  debounceMs?: number;
  rows?: number;
}

export const DebouncedInput = memo(function DebouncedInput({
  value,
  onChange,
  debounceMs = 300,
  ...rest
}: DebouncedInputProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  }, [onChange, debounceMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Input
      value={localValue}
      onChange={handleChange}
      {...rest}
    />
  );
});

export const DebouncedTextarea = memo(function DebouncedTextarea({
  value,
  onChange,
  debounceMs = 300,
  rows = 3,
  ...rest
}: DebouncedTextareaProps) {
  const [localValue, setLocalValue] = useState(value);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    if (value !== localValue) {
      setLocalValue(value);
    }
  }, [value]);

  const handleChange = useCallback((e: ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      onChange(newValue);
    }, debounceMs);
  }, [onChange, debounceMs]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <Textarea
      value={localValue}
      onChange={handleChange}
      rows={rows}
      {...rest}
    />
  );
});
