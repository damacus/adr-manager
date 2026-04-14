import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  fetchAdrs,
  exchangeCodeForToken,
  getGitLabAuthUrl,
  generateCodeVerifier,
  generateCodeChallenge,
} = vi.hoisted(() => ({
  fetchAdrs: vi.fn(),
  exchangeCodeForToken: vi.fn(),
  getGitLabAuthUrl: vi.fn(),
  generateCodeVerifier: vi.fn(),
  generateCodeChallenge: vi.fn(),
}));

vi.mock('./lib/config', () => ({
  isDevMode: false,
  gitlabClientId: 'gitlab-client-id',
  repoName: 'group/project',
  repoBranch: 'main',
  adrDir: 'docs/adr',
}));

vi.mock('./lib/gitlab', () => ({
  fetchAdrs,
  exchangeCodeForToken,
  getGitLabAuthUrl,
}));

vi.mock('./lib/pkce', () => ({
  generateCodeVerifier,
  generateCodeChallenge,
}));

import App from './App';

describe('App', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    window.history.replaceState(null, '', '/');
    fetchAdrs.mockReset();
    exchangeCodeForToken.mockReset();
    getGitLabAuthUrl.mockReset();
    generateCodeVerifier.mockReset();
    generateCodeChallenge.mockReset();
  });

  it('renders the sign-in state when no token is stored', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /adr manager/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in with gitlab/i })).toBeInTheDocument();
  });

  it('bootstraps from localStorage and loads ADRs', async () => {
    localStorage.setItem('gitlab_token', 'stored-token');
    fetchAdrs.mockResolvedValue([]);

    render(<App />);

    await waitFor(() => {
      expect(fetchAdrs).toHaveBeenCalledWith('stored-token', 'group/project', 'main', 'docs/adr');
    });

    expect(screen.getByText(/connected to/i)).toHaveTextContent('group/project');
  });

  it('starts the login flow and persists the PKCE verifier', async () => {
    const user = userEvent.setup();
    const openSpy = vi.spyOn(window, 'open').mockReturnValue({} as Window);

    getGitLabAuthUrl.mockReturnValue('https://gitlab.com/oauth/authorize');
    generateCodeVerifier.mockReturnValue('verifier-123');
    generateCodeChallenge.mockResolvedValue('challenge-123');

    render(<App />);
    await user.click(screen.getByRole('button', { name: /sign in with gitlab/i }));

    await waitFor(() => {
      expect(getGitLabAuthUrl).toHaveBeenCalledWith(
        'gitlab-client-id',
        'http://localhost:3000/',
        'challenge-123'
      );
    });

    expect(localStorage.getItem('gitlab_code_verifier')).toBe('verifier-123');
    expect(openSpy).toHaveBeenCalledWith(
      'https://gitlab.com/oauth/authorize',
      'gitlab_oauth',
      expect.stringContaining('width=600')
    );
  });

  it('alerts the user when the auth popup is blocked', async () => {
    const user = userEvent.setup();
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined);
    vi.spyOn(window, 'open').mockReturnValue(null);

    getGitLabAuthUrl.mockReturnValue('https://gitlab.com/oauth/authorize');
    generateCodeVerifier.mockReturnValue('verifier-123');
    generateCodeChallenge.mockResolvedValue('challenge-123');

    render(<App />);
    await user.click(screen.getByRole('button', { name: /sign in with gitlab/i }));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Please allow popups for this site to connect your account.');
    });
  });

  it('exchanges auth codes received from an allowed origin', async () => {
    exchangeCodeForToken.mockResolvedValue({ access_token: 'new-token' });
    fetchAdrs.mockResolvedValue([]);
    localStorage.setItem('gitlab_code_verifier', 'stored-verifier');

    render(<App />);

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'http://localhost:3000',
        data: { type: 'GITLAB_AUTH_CODE', code: 'oauth-code' },
      })
    );

    await waitFor(() => {
      expect(exchangeCodeForToken).toHaveBeenCalledWith(
        'gitlab-client-id',
        'http://localhost:3000/',
        'oauth-code',
        'stored-verifier'
      );
    });

    await waitFor(() => {
      expect(fetchAdrs).toHaveBeenCalledWith('new-token', 'group/project', 'main', 'docs/adr');
    });

    expect(localStorage.getItem('gitlab_token')).toBe('new-token');
    expect(localStorage.getItem('gitlab_code_verifier')).toBeNull();
  });

  it('ignores auth codes received from disallowed origins', async () => {
    render(<App />);

    window.dispatchEvent(
      new MessageEvent('message', {
        origin: 'https://evil.example.com',
        data: { type: 'GITLAB_AUTH_CODE', code: 'oauth-code' },
      })
    );

    await waitFor(() => {
      expect(exchangeCodeForToken).not.toHaveBeenCalled();
    });
  });

  it('handles the same-window auth callback path', async () => {
    localStorage.setItem('gitlab_code_verifier', 'stored-verifier');
    exchangeCodeForToken.mockResolvedValue({ access_token: 'new-token' });
    fetchAdrs.mockResolvedValue([]);
    window.history.replaceState(null, '', '/?code=oauth-code');

    render(<App />);

    await waitFor(() => {
      expect(exchangeCodeForToken).toHaveBeenCalledWith(
        'gitlab-client-id',
        'http://localhost:3000/',
        'oauth-code',
        'stored-verifier'
      );
    });

    await waitFor(() => {
      expect(fetchAdrs).toHaveBeenCalledWith('new-token', 'group/project', 'main', 'docs/adr');
    });

    expect(localStorage.getItem('gitlab_token')).toBe('new-token');
  });

  it('shows an auth error when code exchange fails without storing a token', async () => {
    localStorage.setItem('gitlab_code_verifier', 'stored-verifier');
    exchangeCodeForToken.mockRejectedValue(new Error('PKCE mismatch'));
    window.history.replaceState(null, '', '/?code=oauth-code');

    render(<App />);

    expect(await screen.findByText('Failed to authenticate with GitLab: PKCE mismatch')).toBeInTheDocument();
    expect(localStorage.getItem('gitlab_token')).toBeNull();
    expect(fetchAdrs).not.toHaveBeenCalled();
  });

  it('logs out when ADR loading returns a 401 error', async () => {
    localStorage.setItem('gitlab_token', 'expired-token');
    fetchAdrs.mockRejectedValue(new Error('[401] unauthorized'));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in with gitlab/i })).toBeInTheDocument();
    });

    expect(localStorage.getItem('gitlab_token')).toBeNull();
  });
});
