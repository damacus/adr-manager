import type { Adr } from '../types';

export const mockAdrs: Adr[] = [
  {
    id: '001-use-vite',
    title: 'Use Vite',
    status: 'accepted',
    date: '2026-04-01T00:00:00.000Z',
    author: 'Alice',
    context: 'The team needs a fast frontend toolchain with minimal configuration overhead.',
    decision: 'Adopt Vite for local development, test runs, and production builds.',
    consequences: 'Faster startup and rebuilds, with a smaller amount of custom bundler configuration.',
    url: 'https://gitlab.com/group/project/-/blob/main/docs/adr/001-use-vite.md',
  },
  {
    id: '002-contribution-model',
    title: 'Contribution Model',
    status: 'proposed',
    date: '2026-04-03T00:00:00.000Z',
    author: 'Bob',
    context: 'External contributors need a safe path to propose changes without direct write access.',
    decision: 'Support a fork-based contribution flow for users without direct project push access.',
    consequences: 'Slightly more implementation work, but a better fit for public collaboration.',
    url: 'https://gitlab.com/group/project/-/blob/main/docs/adr/002-contribution-model.md',
  },
  {
    id: '003-custom-domain-oauth',
    title: 'Custom Domain OAuth Callback',
    status: 'accepted',
    date: '2026-04-10T00:00:00.000Z',
    author: 'Carol',
    context: 'GitLab Pages auth and application OAuth must not compete for the same callback handling.',
    decision: 'Use a custom domain for the app and accept OAuth popup messages from the current deployed origin.',
    consequences: 'Custom-domain setup is required, but the OAuth flow is stable across local and deployed environments.',
    url: 'https://gitlab.com/group/project/-/blob/main/docs/adr/003-custom-domain-oauth.md',
  },
];
