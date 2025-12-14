import { useState, useCallback } from 'react';

type StateOrUpdater<T> = T | ((prev: T) => T);

interface HistoryResult<T> {
  state: T;
  setState: (newState: StateOrUpdater<T>) => void; // Standard setter, does NOT commit to history (update in place)
  pushState: (newState: StateOrUpdater<T>) => void; // Update state AND commit previous state to history
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

export function useHistory<T>(initialState: T): HistoryResult<T> {
  const [past, setPast] = useState<T[]>([]);
  const [present, setPresent] = useState<T>(initialState);
  const [future, setFuture] = useState<T[]>([]);

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  const undo = useCallback(() => {
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);

    setPast(newPast);
    setFuture([present, ...future]);
    setPresent(previous);
  }, [past, present, future]);

  const redo = useCallback(() => {
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);

    setPast([...past, present]);
    setPresent(next);
    setFuture(newFuture);
  }, [past, present, future]);

  // Standard setState: Just updates the current value, doesn't touch history.
  // Useful for intermediate drag states.
  const setState = useCallback((newState: StateOrUpdater<T>) => {
    setPresent(prev => (typeof newState === 'function' ? (newState as (value: T) => T)(prev) : newState));
  }, []);

  // Push new state: Commits the *current* 'present' to history, then sets new 'present'.
  // Use this for discrete actions (like Copy, or Drag Start/End boundary).
  const pushState = useCallback((newState: StateOrUpdater<T>) => {
    setPast(prev => [...prev, present]);
    const resolvedState = typeof newState === 'function' ? (newState as (value: T) => T)(present) : newState;
    setPresent(resolvedState);
    setFuture([]); // Clear future when a new action is taken
  }, [present]);

  const clearHistory = useCallback(() => {
      setPast([]);
      setFuture([]);
  }, []);

  return {
    state: present,
    setState,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory
  };
}
