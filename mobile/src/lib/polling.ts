import { useEffect } from 'react';

export function useInterval(callback: () => void, delay: number, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    callback();
    const id = setInterval(callback, delay);
    return () => clearInterval(id);
  }, [callback, delay, enabled]);
}
