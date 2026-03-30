import { useState, useEffect, useCallback } from 'react';

export interface SavedFilter {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault: boolean;
  createdAt: string;
}

interface UseSavedFiltersReturn {
  savedFilters: SavedFilter[];
  saveFilter: (name: string, filters: Record<string, any>, isDefault?: boolean) => void;
  deleteFilter: (id: string) => void;
  setDefault: (id: string | null) => void;
  getDefaultFilter: () => SavedFilter | undefined;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function readFromStorage(key: string): SavedFilter[] {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useSavedFilters(context: string): UseSavedFiltersReturn {
  const storageKey = `saved-filters-${context}`;

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => readFromStorage(storageKey));

  // Re-init when storageKey changes (e.g. switching funnels)
  useEffect(() => {
    setSavedFilters(readFromStorage(storageKey));
  }, [storageKey]);

  // Persist to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(savedFilters));
    } catch {
      // localStorage full or unavailable
    }
  }, [savedFilters, storageKey]);

  const saveFilter = useCallback((name: string, filters: Record<string, any>, isDefault = false) => {
    const newFilter: SavedFilter = {
      id: generateId(),
      name,
      filters,
      isDefault,
      createdAt: new Date().toISOString(),
    };

    setSavedFilters(prev => {
      let updated = [...prev, newFilter];
      // Se marcou como default, desmarcar os outros
      if (isDefault) {
        updated = updated.map(f => f.id === newFilter.id ? f : { ...f, isDefault: false });
      }
      return updated;
    });
  }, []);

  const deleteFilter = useCallback((id: string) => {
    setSavedFilters(prev => prev.filter(f => f.id !== id));
  }, []);

  const setDefault = useCallback((id: string | null) => {
    setSavedFilters(prev =>
      prev.map(f => ({ ...f, isDefault: f.id === id }))
    );
  }, []);

  const getDefaultFilter = useCallback(() => {
    return savedFilters.find(f => f.isDefault);
  }, [savedFilters]);

  return {
    savedFilters,
    saveFilter,
    deleteFilter,
    setDefault,
    getDefaultFilter,
  };
}
