import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getStoredCodeVerifier,
  getStoredToken,
  removeStoredCodeVerifier,
  removeStoredToken,
  setStoredCodeVerifier,
  setStoredToken,
} from './tokenStorage';

describe('token storage helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
  });

  it('stores and retrieves token and verifier values', () => {
    setStoredToken('token-123');
    setStoredCodeVerifier('verifier-456');

    expect(getStoredToken()).toBe('token-123');
    expect(getStoredCodeVerifier()).toBe('verifier-456');

    removeStoredToken();
    removeStoredCodeVerifier();

    expect(getStoredToken()).toBeNull();
    expect(getStoredCodeVerifier()).toBeNull();
  });

  it('falls back safely when storage access throws', () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(localStorage, 'removeItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(getStoredToken()).toBeNull();
    expect(getStoredCodeVerifier()).toBeNull();
    expect(() => setStoredToken('token-123')).not.toThrow();
    expect(() => setStoredCodeVerifier('verifier-456')).not.toThrow();
    expect(() => removeStoredToken()).not.toThrow();
    expect(() => removeStoredCodeVerifier()).not.toThrow();
  });
});
