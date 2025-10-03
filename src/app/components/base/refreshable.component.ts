import { useCallback, useEffect, useRef } from 'react';
import { autoRefreshService } from '../../services/auto-refresh.service';

type RefreshFn = () => void | Promise<void>;

// React hook to make a component refreshable via the global autoRefreshService
export function useRefreshable(refreshFn: RefreshFn) {
  const busyRef = useRef(false);

  const exec = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      await refreshFn();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('useRefreshable refresh error:', err);
    } finally {
      busyRef.current = false;
    }
  }, [refreshFn]);

  useEffect(() => {
    const unsubscribe = autoRefreshService.onRefresh(exec);
    return () => {
      unsubscribe();
    };
  }, [exec]);

  const forceRefresh = useCallback(async () => {
    await autoRefreshService.forceRefresh();
  }, []);

  return { forceRefresh };
}
