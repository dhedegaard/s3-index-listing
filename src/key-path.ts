// S3 keys can hold URL-reserved characters (`#`, `?`, `%`): encode each segment, keep the slashes.
export const keyHref = (key: string): string =>
  '/' + key.replace(/\/$/, '').split('/').map(encodeURIComponent).join('/')

/**
 * The inverse of `keyHref` for route params, which Next leaves percent-encoded (`g%C3%A5tur.png`).
 * Returns null for a malformed escape, or a decoded '/' (`%2F`), which would let two URLs name one
 * key.
 */
export function decodeSegments(segments: readonly string[]): string[] | null {
  try {
    const decoded = segments.map((segment) => decodeURIComponent(segment))
    return decoded.some((segment) => segment.includes('/')) ? null : decoded
  } catch {
    return null
  }
}

// For headings and links around a page that may 404: params that don't decode are shown raw.
export const displaySegments = (segments: readonly string[] = []): readonly string[] =>
  decodeSegments(segments) ?? segments
