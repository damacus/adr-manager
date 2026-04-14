export const getRedirectUri = (locationLike: Pick<Location, 'origin' | 'pathname'>) =>
  `${locationLike.origin}${locationLike.pathname}`;

export const isAllowedMessageOrigin = (
  origin: string,
  locationLike: Pick<Location, 'origin'>
) => origin === locationLike.origin;
