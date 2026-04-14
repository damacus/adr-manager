import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateCodeChallenge, generateCodeVerifier } from './pkce';

describe('pkce helpers', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('builds a verifier from browser crypto bytes', () => {
    vi.spyOn(window.crypto, 'getRandomValues').mockImplementation((array) => {
      const target = array as Uint32Array;
      target.fill(255);
      return array;
    });

    const verifier = generateCodeVerifier();

    expect(verifier).toBe('ff'.repeat(28));
  });

  it('creates a URL-safe SHA-256 code challenge', async () => {
    vi.spyOn(window.crypto.subtle, 'digest').mockResolvedValue(Uint8Array.from([251, 255, 239]).buffer);

    await expect(generateCodeChallenge('verifier')).resolves.toBe('-__v');
  });
});
