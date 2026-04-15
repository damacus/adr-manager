import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

const localStorageState = new Map<string, string>();
const sessionStorageState = new Map<string, string>();

const createStorageMock = (state: Map<string, string>) => ({
  getItem: (key: string) => state.get(key) ?? null,
  setItem: (key: string, value: string) => {
    state.set(key, value);
  },
  removeItem: (key: string) => {
    state.delete(key);
  },
  clear: () => {
    state.clear();
  },
});

const localStorageMock = createStorageMock(localStorageState);
const sessionStorageMock = createStorageMock(sessionStorageState);

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  configurable: true,
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true,
});

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  configurable: true,
});

Object.defineProperty(window, 'scrollTo', {
  value: vi.fn(),
  configurable: true,
});
