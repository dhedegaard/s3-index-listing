// S3 keys can hold URL-reserved characters (`#`, `?`, `%`): encode each segment, keep the slashes.
export const keyHref = (key: string): string =>
  '/' + key.replace(/\/$/, '').split('/').map(encodeURIComponent).join('/')
