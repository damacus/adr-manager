export const isDevMode = import.meta.env.DEV;
export const gitlabClientId = import.meta.env.VITE_GITLAB_CLIENT_ID;
export const repoName = import.meta.env.VITE_REPO_NAME || 'demo/adr-manager';
export const repoBranch = import.meta.env.VITE_REPO_BRANCH || 'main';
export const adrDir = import.meta.env.VITE_ADR_DIR || 'docs/adr';
