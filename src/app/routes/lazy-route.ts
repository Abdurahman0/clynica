import { lazy, type ComponentType, type LazyExoticComponent } from 'react';

function isChunkLoadError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message : String(error ?? '');

  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk \d+ failed/i.test(
    message,
  );
}

function pendingPromise(): Promise<never> {
  return new Promise<never>(() => {
    // Keep suspense pending while the page reloads.
  });
}

export function lazyRoute<T extends ComponentType<unknown>>(
  importer: () => Promise<{ default: T }>,
  routeKey: string,
): LazyExoticComponent<T> {
  return lazy(async () => {
    const reloadGuardKey = `renaissance-clinic:lazy-retry:${routeKey}`;

    try {
      const module = await importer();
      window.sessionStorage.removeItem(reloadGuardKey);
      return module;
    } catch (error) {
      if (!isChunkLoadError(error)) {
        throw error;
      }

      const hasRetried = window.sessionStorage.getItem(reloadGuardKey) === '1';
      if (!hasRetried) {
        window.sessionStorage.setItem(reloadGuardKey, '1');
        window.location.reload();
        return pendingPromise();
      }

      window.sessionStorage.removeItem(reloadGuardKey);
      throw error;
    }
  });
}
