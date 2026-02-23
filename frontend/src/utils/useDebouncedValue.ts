import { useState, useEffect } from "react";

/**
 * Returns a debounced copy of `value` that only updates after `delay` ms
 * of inactivity. Use this to throttle API calls triggered by user input.
 *
 * @example
 * const [search, setSearch] = useState("");
 * const debouncedSearch = useDebouncedValue(search, 300);
 * useQuery({ queryKey: ["items", debouncedSearch], ... });
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debounced;
}
