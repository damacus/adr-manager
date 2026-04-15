import { describe, expect, it } from 'vitest';
import { generateOAuthState, getRedirectUri, isAllowedMessageOrigin } from './auth';

describe('auth helpers', () => {
  it('builds a redirect URI for the root path', () => {
    expect(getRedirectUri({ origin: 'https://app.example.com', pathname: '/' })).toBe(
      'https://app.example.com/'
    );
  });

  it('builds a redirect URI for nested paths', () => {
    expect(getRedirectUri({ origin: 'https://app.example.com', pathname: '/adr-manager/' })).toBe(
      'https://app.example.com/adr-manager/'
    );
  });

  it('allows messages from the current origin', () => {
    expect(isAllowedMessageOrigin('https://app.example.com', { origin: 'https://app.example.com' })).toBe(true);
  });

  it('rejects messages from other origins', () => {
    expect(isAllowedMessageOrigin('https://evil.example.com', { origin: 'https://app.example.com' })).toBe(false);
  });

  it('generates a random-looking OAuth state string', () => {
    const state = generateOAuthState();

    expect(state).toMatch(/^[a-f0-9]{32}$/);
  });
});
