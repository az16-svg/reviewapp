'use client';

import { useState, useCallback } from 'react';
import type { Change } from '@/types/change';

export interface UseChangesReturn {
  changes: Change[];
  addChange: (change: Change) => void;
  updateChange: (id: string, updates: Partial<Omit<Change, 'id'>>) => void;
  deleteChange: (id: string) => void;
  setChanges: (changes: Change[]) => void;
}

export function useChanges(initialChanges: Change[] = []): UseChangesReturn {
  const [changes, setChangesState] = useState<Change[]>(initialChanges);

  const addChange = useCallback((change: Change) => {
    setChangesState((prev) => [...prev, change]);
  }, []);

  const updateChange = useCallback((id: string, updates: Partial<Omit<Change, 'id'>>) => {
    setChangesState((prev) =>
      prev.map((change) =>
        change.id === id ? { ...change, ...updates } : change
      )
    );
  }, []);

  const deleteChange = useCallback((id: string) => {
    setChangesState((prev) => prev.filter((change) => change.id !== id));
  }, []);

  const setChanges = useCallback((newChanges: Change[]) => {
    setChangesState(newChanges);
  }, []);

  return {
    changes,
    addChange,
    updateChange,
    deleteChange,
    setChanges,
  };
}
