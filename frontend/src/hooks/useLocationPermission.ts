import { useState, useEffect, useCallback } from 'react';

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unavailable';

export function useLocationPermission() {
  const [state, setState] = useState<PermissionState>('prompt');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    if (!navigator.geolocation) {
      setState('unavailable');
      return;
    }
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'geolocation' }).then((result) => {
        setState(result.state as PermissionState);
        result.addEventListener('change', () => setState(result.state as PermissionState));
      });
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const request = useCallback(
    (
      onSuccess: (pos: GeolocationPosition) => void,
      onError?: (err: GeolocationPositionError) => void,
      opts?: PositionOptions,
    ) => {
      if (!navigator.geolocation) {
        setState('unavailable');
        setError('Geolocation is not available on this device.');
        return;
      }
      setError(null);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setState('granted');
          onSuccess(pos);
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) setState('denied');
          setError(err.message);
          onError?.(err);
        },
        { enableHighAccuracy: true, timeout: 15000, ...opts },
      );
    },
    [],
  );

  return { state, error, request, refresh };
}
