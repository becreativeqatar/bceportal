'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseBoardPollingOptions {
  pollingInterval?: number; // milliseconds, default 5000 (5 seconds)
  enabled?: boolean;
}

interface BoardData {
  id: string;
  title: string;
  description?: string;
  columns: any[];
  members: any[];
  labels: any[];
  userRole: string;
  [key: string]: any;
}

export function useBoardPolling<T = BoardData>(
  url: string,
  options: UseBoardPollingOptions = {}
) {
  const { pollingInterval = 5000, enabled = true } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (isInitial = false) => {
      if (isInitial) setLoading(true);

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(url, {
          signal: abortControllerRef.current.signal,
        });

        if (!response.ok) {
          throw new Error('Failed to fetch data');
        }

        const result = await response.json();
        // The API returns { board: ... }, so extract the board
        setData(result.board || result);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err);
        }
      } finally {
        if (isInitial) setLoading(false);
      }
    },
    [url]
  );

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      fetchData(true);
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchData, enabled]);

  // Polling
  useEffect(() => {
    if (!enabled) return;

    const pollInterval = setInterval(() => {
      fetchData(false);
    }, pollingInterval);

    return () => clearInterval(pollInterval);
  }, [fetchData, pollingInterval, enabled]);

  const refresh = useCallback(() => {
    fetchData(false);
  }, [fetchData]);

  return { data, loading, error, lastUpdated, refresh, setData };
}

// Hook for optimistic updates
export function useOptimisticUpdate<T>(
  initialData: T | null,
  onUpdate: (data: T) => Promise<void>
) {
  const [data, setData] = useState<T | null>(initialData);
  const [pendingUpdate, setPendingUpdate] = useState(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const optimisticUpdate = useCallback(
    async (newData: T, rollbackData?: T) => {
      const previousData = rollbackData ?? data;

      // Optimistically update UI
      setData(newData);
      setPendingUpdate(true);

      try {
        await onUpdate(newData);
      } catch (error) {
        // Rollback on error
        setData(previousData);
        throw error;
      } finally {
        setPendingUpdate(false);
      }
    },
    [data, onUpdate]
  );

  return { data, setData, optimisticUpdate, pendingUpdate };
}
