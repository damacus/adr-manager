export const getRedirectUri = (locationLike: Pick<Location, 'origin' | 'pathname'>) =>
  `${locationLike.origin}${locationLike.pathname}`;

export const isAllowedMessageOrigin = (origin: string) =>
  origin.endsWith('.run.app') || origin.includes('localhost');
