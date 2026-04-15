const CODE_VERIFIER_KEY = 'gitlab_code_verifier';
const OAUTH_STATE_KEY = 'gitlab_oauth_state';

const withStorage = <T>(callback: () => T, fallback: T): T => {
  try {
    return callback();
  } catch {
    return fallback;
  }
};

export const getStoredCodeVerifier = () => withStorage(() => sessionStorage.getItem(CODE_VERIFIER_KEY), null);

export const setStoredCodeVerifier = (verifier: string) => {
  withStorage(() => {
    sessionStorage.setItem(CODE_VERIFIER_KEY, verifier);
    return undefined;
  }, undefined);
};

export const removeStoredCodeVerifier = () => {
  withStorage(() => {
    sessionStorage.removeItem(CODE_VERIFIER_KEY);
    return undefined;
  }, undefined);
};

export const getStoredOAuthState = () => withStorage(() => sessionStorage.getItem(OAUTH_STATE_KEY), null);

export const setStoredOAuthState = (state: string) => {
  withStorage(() => {
    sessionStorage.setItem(OAUTH_STATE_KEY, state);
    return undefined;
  }, undefined);
};

export const removeStoredOAuthState = () => {
  withStorage(() => {
    sessionStorage.removeItem(OAUTH_STATE_KEY);
    return undefined;
  }, undefined);
};
