import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';

type Serializer<T> = (value: T) => string;
type Deserializer<T> = (value: string) => T;

type PersistentStateOptions<T> = {
  serialize?: Serializer<T>;
  deserialize?: Deserializer<T>;
};

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function usePersistentState<T>(
  storageKey: string,
  initialValue: T,
  options?: PersistentStateOptions<T>,
): [T, Dispatch<SetStateAction<T>>] {
  const serialize = options?.serialize ?? JSON.stringify;
  const deserialize = options?.deserialize ?? ((value: string) => JSON.parse(value) as T);

  const [value, setValue] = useState<T>(() => {
    if (!canUseStorage()) {
      return initialValue;
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        return initialValue;
      }

      return deserialize(raw);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    if (!canUseStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(storageKey, serialize(value));
    } catch {
      // Swallow storage errors (for example private mode quota limitations).
    }
  }, [serialize, storageKey, value]);

  return [value, setValue];
}
