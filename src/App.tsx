import React, { useState, useEffect } from 'react';
import { AdrList } from './components/AdrList';
import { AdrWizard } from './components/AdrWizard';
import { Adr } from './types';
import { fetchAdrs, getGitLabAuthUrl, exchangeCodeForToken } from './lib/gitlab';
import { generateCodeVerifier, generateCodeChallenge } from './lib/pkce';
import { generateOAuthState, getRedirectUri, isAllowedMessageOrigin } from './lib/auth';
import { adrDir, gitlabClientId, isDevMode, repoBranch, repoName } from './lib/config';
import { mockAdrs } from './lib/mockAdrs';
import {
  getStoredCodeVerifier,
  removeStoredCodeVerifier,
  getStoredOAuthState,
  removeStoredOAuthState,
  setStoredCodeVerifier,
  setStoredOAuthState,
} from './lib/tokenStorage';

function App() {
  const [token, setToken] = useState<string | null>(() => (isDevMode ? 'dev-mode-token' : null));
  const [adrs, setAdrs] = useState<Adr[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearAuthTransaction = () => {
    removeStoredCodeVerifier();
    removeStoredOAuthState();
  };

  const handleAuthCode = async (code: string, returnedState: string | null) => {
    try {
      const verifier = getStoredCodeVerifier();
      const expectedState = getStoredOAuthState();

      if (!verifier) throw new Error('No code verifier found');
      if (!returnedState || !expectedState || returnedState !== expectedState) {
        throw new Error('Invalid authentication state');
      }

      const redirectUri = getRedirectUri(window.location);
      const data = await exchangeCodeForToken(gitlabClientId, redirectUri, code, verifier);

      if (data.access_token) {
        setToken(data.access_token);
        clearAuthTransaction();
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err: any) {
      clearAuthTransaction();
      window.history.replaceState(null, '', window.location.pathname);
      console.error('Failed to exchange code:', err);
      setError(`Failed to authenticate with GitLab: ${err.message || String(err)}`);
    }
  };

  useEffect(() => {
    // Check URL for code (Authorization Code flow with PKCE)
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (code) {
      if (window.opener) {
        window.opener.postMessage({ type: 'GITLAB_AUTH_CODE', code, state }, window.location.origin);
        window.close();
      } else {
        // Fallback if not in popup
        void handleAuthCode(code, state);
      }
    }
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isAllowedMessageOrigin(event.origin, window.location)) {
        return;
      }

      const authCode = typeof event.data?.code === 'string' ? event.data.code : null;
      const authState = typeof event.data?.state === 'string' ? event.data.state : null;

      if (event.data?.type === 'GITLAB_AUTH_CODE' && authCode && authState) {
        void handleAuthCode(authCode, authState);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (isDevMode) {
      setAdrs(mockAdrs);
      return;
    }

    if (token && repoName) {
      loadAdrs();
    }
  }, [token, repoName]);

  const loadAdrs = async () => {
    if (isDevMode) {
      setAdrs(mockAdrs);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdrs(token!, repoName, repoBranch, adrDir);
      setAdrs(data);
    } catch (err: any) {
      const errorMessage = err?.message || String(err) || 'An unknown error occurred';
      setError(errorMessage);
      if (errorMessage.includes('401')) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    if (isDevMode) {
      setToken('dev-mode-token');
      setAdrs(mockAdrs);
      return;
    }

    if (!gitlabClientId) {
      alert('VITE_GITLAB_CLIENT_ID is not set in environment variables.');
      return;
    }

    setError(null);

    try {
      clearAuthTransaction();

      const verifier = generateCodeVerifier();
      const state = generateOAuthState();
      setStoredCodeVerifier(verifier);
      setStoredOAuthState(state);
      const challenge = await generateCodeChallenge(verifier);

      const redirectUri = getRedirectUri(window.location);
      const authUrl = getGitLabAuthUrl(gitlabClientId, redirectUri, challenge, state);
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const authWindow = window.open(
        authUrl,
        'gitlab_oauth',
        `width=${width},height=${height},left=${left},top=${top}`
      );

      if (!authWindow) {
        clearAuthTransaction();
        alert('Please allow popups for this site to connect your account.');
      }
    } catch (err: any) {
      clearAuthTransaction();
      setError(`Failed to start GitLab authentication: ${err.message || String(err)}`);
    }
  };

  const logout = () => {
    if (isDevMode) {
      setToken('dev-mode-token');
      setAdrs(mockAdrs);
      return;
    }

    clearAuthTransaction();
    setToken(null);
    setAdrs([]);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-gray-900 text-white rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-4">
            A
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ADR Manager</h1>
          <p className="text-gray-500 mb-8">Sign in with GitLab to manage your Architecture Decision Records.</p>

          {error && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-left">
              {error}
            </div>
          )}
          
          <button
            onClick={login}
            className="w-full bg-[#FC6D26] text-white py-2.5 rounded-lg font-medium hover:bg-[#E24329] transition-colors flex items-center justify-center gap-2"
          >
            Sign in with GitLab
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold">
              A
            </div>
            <span className="font-semibold text-gray-900">ADR Manager</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-gray-500">Connected to <strong className="text-gray-900">{repoName}</strong></span>
            <button onClick={logout} className="text-gray-500 hover:text-gray-900 font-medium">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="py-8">
        {error && (
          <div className="max-w-5xl mx-auto px-6 mb-4">
            <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
              {error}
            </div>
          </div>
        )}

        {isCreating ? (
          <AdrWizard 
            onCancel={() => setIsCreating(false)} 
            onComplete={() => {
              setIsCreating(false);
              loadAdrs();
            }}
            token={token}
            repoName={repoName}
            repoBranch={repoBranch}
            adrDir={adrDir}
            existingAdrs={adrs}
          />
        ) : loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        ) : (
          <AdrList 
            adrs={adrs} 
            onCreateNew={() => setIsCreating(true)} 
            token={token} 
            repoName={repoName} 
            repoBranch={repoBranch} 
            adrDir={adrDir}
            statusEditingEnabled
            statusEditingPreviewOnly={isDevMode}
          />
        )}
      </main>
    </div>
  );
}

export default App;
