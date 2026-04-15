# ADR Manager

ADR Manager is a Vite + React frontend for browsing Architecture Decision Records stored in a GitLab repository and creating new ADR merge requests from a guided wizard.

## Development

### Prerequisites

- Node.js 24+
- `pnpm`

### Install

```bash
pnpm install
```

### Run locally

```bash
pnpm dev
```

### Verify

```bash
pnpm test
pnpm lint
```

## Configuration

Set these variables in a local `.env` file:

```env
VITE_GITLAB_CLIENT_ID=your_gitlab_oauth_app_id
VITE_REPO_NAME=group/project
VITE_REPO_BRANCH=main
VITE_ADR_DIR=docs/adr
```

`VITE_REPO_BRANCH` defaults to `main` and `VITE_ADR_DIR` defaults to `docs/adr`.

For GitLab Pages deployments, set the same `VITE_*` values in the project's CI/CD variables so they are available during `pnpm build`.

## Authentication

ADR Manager uses a session-only GitLab OAuth flow in the browser. The app keeps the signed-in user's GitLab access token only for the active tab session, so reloading the page or reopening the app requires signing in again.

The app acts with the permissions of the GitLab user who completes the OAuth flow. Any repository reads or writes come from that user's access rights, not from a shared service account.

Because this is deployed as a GitLab Pages SPA, it does not use a backend session store or server-side token exchange. That deployment model is the reason the auth flow is intentionally session-scoped rather than persistent across browser restarts.
