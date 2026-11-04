/**
 * A tiny external store backed by Web Storage, for useSyncExternalStore.
 * Every storage access is wrapped: storage can be missing or throw (private
 * mode, blocked site data), and the UI must still work in memory.
 */
export interface BrowserStore<T> {
  get(): T;
  set(next: T): void;
  subscribe(listener: () => void): () => void;
  serverSnapshot: T;
}

export function createBrowserStore<T>(options: {
  key: string;
  storage: "local" | "session";
  initial: T;
  parse: (raw: unknown) => T;
}): BrowserStore<T> {
  const { key, initial, parse } = options;
  const listeners = new Set<() => void>();
  let cache: T | undefined;

  const storage = (): Storage | null => {
    try {
      if (typeof window === "undefined") return null;
      return options.storage === "local" ? window.localStorage : window.sessionStorage;
    } catch {
      return null;
    }
  };

  const read = (): T => {
    try {
      const raw = storage()?.getItem(key);
      return raw == null ? initial : parse(JSON.parse(raw));
    } catch {
      return initial;
    }
  };

  const emit = () => listeners.forEach((l) => l());

  const onStorage = (e: StorageEvent) => {
    if (e.key === key) {
      cache = read();
      emit();
    }
  };

  return {
    serverSnapshot: initial,
    get() {
      if (cache === undefined) cache = read();
      return cache;
    },
    set(next) {
      cache = next;
      try {
        storage()?.setItem(key, JSON.stringify(next));
      } catch {
        // Storage unavailable: keep the in-memory value for this page view.
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1 && typeof window !== "undefined") window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && typeof window !== "undefined") window.removeEventListener("storage", onStorage);
      };
    },
  };
}
