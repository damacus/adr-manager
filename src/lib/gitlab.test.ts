import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createAdrMr,
  exchangeCodeForToken,
  fetchAdrDetails,
  fetchAdrs,
  getGitLabAuthUrl,
} from './gitlab';

const mockFetch = vi.fn();

describe('gitlab helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', mockFetch);
    mockFetch.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('builds the OAuth URL with PKCE parameters', () => {
    const url = getGitLabAuthUrl('client-id', 'https://app.example.com/callback', 'challenge-value');

    expect(url).toContain('client_id=client-id');
    expect(url).toContain('redirect_uri=https%3A%2F%2Fapp.example.com%2Fcallback');
    expect(url).toContain('code_challenge=challenge-value');
    expect(url).toContain('code_challenge_method=S256');
  });

  it('returns the token payload on a successful code exchange', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ access_token: 'token-123' }),
    });

    await expect(
      exchangeCodeForToken('client-id', 'https://app.example.com/callback', 'oauth-code', 'verifier')
    ).resolves.toEqual({ access_token: 'token-123' });

    expect(mockFetch).toHaveBeenCalledWith(
      'https://gitlab.com/oauth/token',
      expect.objectContaining({
        method: 'POST',
      })
    );
  });

  it('surfaces exchange errors with GitLab details', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      statusText: 'Bad Request',
      json: vi.fn().mockResolvedValue({ error_description: 'PKCE mismatch' }),
    });

    await expect(
      exchangeCodeForToken('client-id', 'https://app.example.com/callback', 'oauth-code', 'verifier')
    ).rejects.toThrow('Failed to exchange code for token: PKCE mismatch');
  });

  it('parses ADR listings and detail metadata from GitLab responses', async () => {
    const encodedRepo = encodeURIComponent('group/project');
    const encodedFile = encodeURIComponent('docs/adr/001-use-vite.md');
    const markdown = `---
status: accepted
date: 2026-01-15
---
# Use Vite

## Context and Problem Statement

Slow local development.

## Decision Outcome

Chosen option: "Use Vite", because it starts fast.

### Positive Consequences

Faster startup.
`;
    const encodedContent = btoa(markdown);

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes(`/projects/${encodedRepo}/repository/tree?path=docs/adr&ref=main`)) {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue([
            { name: '001-use-vite.md', type: 'blob' },
            { name: 'notes.txt', type: 'blob' },
          ]),
        };
      }

      if (url.includes(`/repository/files/${encodedFile}?ref=main`)) {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ content: encodedContent }),
        };
      }

      if (url.includes(`/repository/commits?path=${encodedFile}&ref_name=main&per_page=1`)) {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue([{ author_name: 'Jane Doe' }]),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    const adrs = await fetchAdrs('token', 'group/project', 'main', 'docs/adr');

    expect(adrs).toEqual([
      expect.objectContaining({
        id: '001-use-vite',
        title: '001 use vite',
        status: 'accepted',
        date: '2026-01-15',
        author: 'Jane Doe',
        context: 'Slow local development.',
        decision: 'Chosen option: "Use Vite", because it starts fast.',
        consequences: 'Faster startup.',
        url: 'https://gitlab.com/group/project/-/blob/main/docs/adr/001-use-vite.md',
      }),
    ]);
  });

  it('rejects ADR list requests with invalid payloads', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ items: [] }),
    });

    await expect(fetchAdrs('token', 'group/project', 'main', 'docs/adr')).rejects.toThrow(
      'Invalid response from GitLab API: expected an array of files. Check your repository name and path.'
    );
  });

  it('returns unknown author when commit history is unavailable', async () => {
    const encodedRepo = encodeURIComponent('group/project');
    const encodedFile = encodeURIComponent('docs/adr/001-use-vite.md');
    const markdown = `## Context\n\nContext\n\n## Decision\n\nDecision\n\n### Consequences\n\nConsequence`;

    mockFetch.mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.includes(`/projects/${encodedRepo}/repository/files/${encodedFile}?ref=main`)) {
        return {
          ok: true,
          json: vi.fn().mockResolvedValue({ content: btoa(markdown) }),
        };
      }

      if (url.includes('/repository/commits?')) {
        return {
          ok: false,
          json: vi.fn(),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    });

    await expect(fetchAdrDetails('token', 'group/project', 'main', 'docs/adr', '001-use-vite')).resolves.toEqual(
      expect.objectContaining({
        status: 'unknown',
        author: 'Unknown',
        context: 'Context',
        decision: 'Decision',
        consequences: 'Consequence',
      })
    );
  });

  it('creates a branch, commit, and merge request with MADR content', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ name: 'branch' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'commit-1' }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({ web_url: 'https://gitlab.com/mr/1' }),
      });

    const result = await createAdrMr('token', 'group/project', 'main', 'docs/adr', 'Use Vite', {
      status: 'accepted',
      decision: 'Adopt Vite',
    });

    expect(result).toEqual({ web_url: 'https://gitlab.com/mr/1' });

    expect(mockFetch).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('/repository/commits'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"file_path":"docs/adr/use-vite.md"'),
      })
    );

    expect(mockFetch).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('/merge_requests'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"title":"docs: add ADR for Use Vite"'),
      })
    );
  });
});
