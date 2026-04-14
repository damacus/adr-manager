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
