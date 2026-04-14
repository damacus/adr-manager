import '@testing-library/jest-dom/vitest';

const storage = new Map<string, string>();

const storageMock = {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => {
    storage.clear();
  },
};

Object.defineProperty(globalThis, 'localStorage', {
  value: storageMock,
  configurable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: storageMock,
  configurable: true,
});
