import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./lib/config', () => ({
  isDevMode: true,
  gitlabClientId: undefined,
  repoName: 'demo/adr-manager',
  repoBranch: 'main',
  adrDir: 'docs/adr',
}));

vi.mock('./lib/gitlab', () => ({
  fetchAdrs: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getGitLabAuthUrl: vi.fn(),
}));

vi.mock('./lib/pkce', () => ({
  generateCodeVerifier: vi.fn(),
  generateCodeChallenge: vi.fn(),
}));

import App from './App';

describe('App in dev mode', () => {
  it('bypasses OAuth and renders mock ADR data', async () => {
    const user = userEvent.setup();

    render(<App />);

    expect(screen.queryByRole('button', { name: /sign in with gitlab/i })).not.toBeInTheDocument();
    expect(await screen.findByText('Use Vite')).toBeInTheDocument();
    expect(screen.getByText(/connected to/i)).toHaveTextContent('demo/adr-manager');

    await user.click(screen.getByText('Use Vite'));

    expect(await screen.findByRole('button', { name: 'Preview status change' })).toBeInTheDocument();
  });
});
