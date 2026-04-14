import React, { useState, useEffect } from 'react';
import { AdrList } from './components/AdrList';
import { AdrWizard } from './components/AdrWizard';
import { Adr } from './types';
import { fetchAdrs, getGitLabAuthUrl, exchangeCodeForToken } from './lib/gitlab';
import { generateCodeVerifier, generateCodeChallenge } from './lib/pkce';

const getStoredToken = () => {
  try {
    return localStorage.getItem('gitlab_token');
  } catch (e) {
    return null;
  }
};

const setStoredToken = (token: string) => {
  try {
    localStorage.setItem('gitlab_token', token);
  } catch (e) {
    console.warn('Failed to save token to localStorage');
  }
};

const removeStoredToken = () => {
  try {
    localStorage.removeItem('gitlab_token');
  } catch (e) {
    console.warn('Failed to remove token from localStorage');
  }
};

function App() {
  const [token, setToken] = useState<string | null>(getStoredToken());
  const [adrs, setAdrs] = useState<Adr[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clientId = import.meta.env.VITE_GITLAB_CLIENT_ID;
  const repoName = import.meta.env.VITE_REPO_NAME;
  const repoBranch = import.meta.env.VITE_REPO_BRANCH || 'main';
  const adrDir = import.meta.env.VITE_ADR_DIR || 'docs/adr';

  useEffect(() => {
    // Check URL for code (Authorization Code flow with PKCE)
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    
    if (code) {
      if (window.opener) {
        window.opener.postMessage({ type: 'GITLAB_AUTH_CODE', code }, '*');
        window.close();
      } else {
        // Fallback if not in popup
        handleAuthCode(code);
      }
    }
  }, []);

  const handleAuthCode = async (code: string) => {
    try {
      const verifier = localStorage.getItem('gitlab_code_verifier');
      if (!verifier) throw new Error('No code verifier found');
      
      const redirectUri = window.location.origin + window.location.pathname;
      const data = await exchangeCodeForToken(clientId, redirectUri, code, verifier);
      
      if (data.access_token) {
        setStoredToken(data.access_token);
        setToken(data.access_token);
        localStorage.removeItem('gitlab_code_verifier');
        window.history.replaceState(null, '', window.location.pathname);
      }
    } catch (err: any) {
      console.error('Failed to exchange code:', err);
      setError(`Failed to authenticate with GitLab: ${err.message || String(err)}`);
    }
  };

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate origin is from AI Studio preview or localhost
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }
      if (event.data?.type === 'GITLAB_AUTH_CODE' && event.data.code) {
        handleAuthCode(event.data.code);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (token && repoName) {
      loadAdrs();
    }
  }, [token, repoName]);

  const loadAdrs = async () => {
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
    if (!clientId) {
      alert('VITE_GITLAB_CLIENT_ID is not set in environment variables.');
      return;
    }
    
    const verifier = generateCodeVerifier();
    localStorage.setItem('gitlab_code_verifier', verifier);
    const challenge = await generateCodeChallenge(verifier);
    
    // Use the exact current URL as the redirect URI to match GitLab config
    const redirectUri = window.location.origin + window.location.pathname;
    const authUrl = getGitLabAuthUrl(clientId, redirectUri, challenge);
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
      alert('Please allow popups for this site to connect your account.');
    }
  };

  const logout = () => {
    removeStoredToken();
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
          />
        )}
      </main>
    </div>
  );
}

export default App;
