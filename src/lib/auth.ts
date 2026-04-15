export const getRedirectUri = (locationLike: Pick<Location, 'origin' | 'pathname'>) =>
  `${locationLike.origin}${locationLike.pathname}`;

export const generateOAuthState = () => {
  const bytes = new Uint8Array(16);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
};

export const isAllowedMessageOrigin = (
  origin: string,
  locationLike: Pick<Location, 'origin'>
) => origin === locationLike.origin;
