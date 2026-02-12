import { useCallback, useEffect, useRef } from "react";

export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay = 2000
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debounced = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  ) as T;

  return debounced;
}

export function useDebounceSave(pageId: string) {
  const save = useCallback(
    async (content: string) => {
      try {
        await fetch(`/api/pages/${pageId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });
      } catch (err) {
        console.error("Auto-save failed:", err);
      }
    },
    [pageId]
  );

  return useDebounce(save, 2000);
}
