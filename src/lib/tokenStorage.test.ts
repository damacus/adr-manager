import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getStoredCodeVerifier,
  getStoredOAuthState,
  removeStoredCodeVerifier,
  removeStoredOAuthState,
  setStoredCodeVerifier,
  setStoredOAuthState,
} from './tokenStorage';

describe('token storage helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('keeps the PKCE verifier and oauth state in sessionStorage', () => {
    setStoredCodeVerifier('verifier-456');
    setStoredOAuthState('state-789');

    expect(sessionStorage.getItem('gitlab_code_verifier')).toBe('verifier-456');
    expect(sessionStorage.getItem('gitlab_oauth_state')).toBe('state-789');
    expect(getStoredCodeVerifier()).toBe('verifier-456');
    expect(getStoredOAuthState()).toBe('state-789');

    removeStoredCodeVerifier();
    removeStoredOAuthState();

    expect(getStoredCodeVerifier()).toBeNull();
    expect(getStoredOAuthState()).toBeNull();
    expect(sessionStorage.getItem('gitlab_code_verifier')).toBeNull();
    expect(sessionStorage.getItem('gitlab_oauth_state')).toBeNull();
  });

  it('falls back safely when storage access throws', () => {
    vi.spyOn(sessionStorage, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(sessionStorage, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });
    vi.spyOn(sessionStorage, 'removeItem').mockImplementation(() => {
      throw new Error('storage unavailable');
    });

    expect(getStoredCodeVerifier()).toBeNull();
    expect(getStoredOAuthState()).toBeNull();
    expect(() => setStoredCodeVerifier('verifier-456')).not.toThrow();
    expect(() => setStoredOAuthState('state-789')).not.toThrow();
    expect(() => removeStoredCodeVerifier()).not.toThrow();
    expect(() => removeStoredOAuthState()).not.toThrow();
  });
});
