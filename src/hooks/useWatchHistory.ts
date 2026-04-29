import { useState, useCallback } from 'react';

  export interface WatchEntry {
    animeId: string;
    episodeId: string;
    episodeNumber: number;
    animeTitle: string;
    poster?: string;
    watchedAt: number;
  }

  const STORAGE_KEY = 'toxinime_history';
  const MAX_ENTRIES = 50;

  export function useWatchHistory() {
    const getAll = useCallback((): WatchEntry[] => {
      try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      } catch {
        return [];
      }
    }, []);

    const [history, setHistory] = useState<WatchEntry[]>(getAll);

    const save = useCallback((entry: Omit<WatchEntry, 'watchedAt'>) => {
      const all = getAll();
      const idx = all.findIndex(h => h.animeId === entry.animeId && h.episodeId === entry.episodeId);
      const updated: WatchEntry = { ...entry, watchedAt: Date.now() };
      if (idx >= 0) {
        all[idx] = updated;
      } else {
        all.unshift(updated);
      }
      const trimmed = all.slice(0, MAX_ENTRIES);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      setHistory(trimmed);
    }, [getAll]);

    const getForAnime = useCallback((animeId: string): WatchEntry | null => {
      return getAll().find(h => h.animeId === animeId) ?? null;
    }, [getAll]);

    const remove = useCallback((animeId: string) => {
      const filtered = getAll().filter(h => h.animeId !== animeId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      setHistory(filtered);
    }, [getAll]);

    const clear = useCallback(() => {
      localStorage.removeItem(STORAGE_KEY);
      setHistory([]);
    }, []);

    return { history, save, getForAnime, remove, clear };
  }