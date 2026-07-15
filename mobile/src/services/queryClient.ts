import { QueryClient } from '@tanstack/react-query';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';

// Stockage mémoire pur JS (pas de module natif, compatible Expo Go)
// Les données persistent le temps que l'app est ouverte
const memoryStorage: Record<string, string> = {};

const inMemoryStorageAdapter = {
  getItem: (key: string) => Promise.resolve(memoryStorage[key] ?? null),
  setItem: (key: string, value: string) => {
    memoryStorage[key] = value;
    return Promise.resolve();
  },
  removeItem: (key: string) => {
    delete memoryStorage[key];
    return Promise.resolve();
  },
};

// Client React Query avec cache long
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      // Données fraîches pendant 5 minutes (pas de refetch inutile)
      staleTime: 5 * 60 * 1000,
      // Cache conservé 1 heure en mémoire
      gcTime: 60 * 60 * 1000,
    },
  },
});

// Persiste dans le stockage mémoire ci-dessus
export const asyncStoragePersister = createAsyncStoragePersister({
  storage: inMemoryStorageAdapter,
  key: 'RIWAYA_CACHE',
  throttleTime: 1000,
});

