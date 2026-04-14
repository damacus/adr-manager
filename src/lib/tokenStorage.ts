const TOKEN_KEY = 'gitlab_token';
const CODE_VERIFIER_KEY = 'gitlab_code_verifier';

const withStorage = <T>(callback: () => T, fallback: T): T => {
  try {
    return callback();
  } catch {
    return fallback;
  }
};

export const getStoredToken = () => withStorage(() => localStorage.getItem(TOKEN_KEY), null);

export const setStoredToken = (token: string) => {
  withStorage(() => {
    localStorage.setItem(TOKEN_KEY, token);
    return undefined;
  }, undefined);
};

export const removeStoredToken = () => {
  withStorage(() => {
    localStorage.removeItem(TOKEN_KEY);
    return undefined;
  }, undefined);
};

export const getStoredCodeVerifier = () => withStorage(() => localStorage.getItem(CODE_VERIFIER_KEY), null);

export const setStoredCodeVerifier = (verifier: string) => {
  withStorage(() => {
    localStorage.setItem(CODE_VERIFIER_KEY, verifier);
    return undefined;
  }, undefined);
};

export const removeStoredCodeVerifier = () => {
  withStorage(() => {
    localStorage.removeItem(CODE_VERIFIER_KEY);
    return undefined;
  }, undefined);
};
