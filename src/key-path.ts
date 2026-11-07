// S3 keys can hold URL-reserved characters (`#`, `?`, `%`): encode each segment, keep the slashes.
export const keyHref = (key: string): string =>
  '/' + key.replace(/\/$/, '').split('/').map(encodeURIComponent).join('/')

/**
 * The inverse of `keyHref` for route params, which Next leaves percent-encoded (`g%C3%A5tur.png`).
 * Returns null for a malformed escape, or a decoded '/' (`%2F`), which would let two URLs name one
 * key.
 */
export function decodeSegments(segments: readonly string[]): string[] | null {
  const decoded: string[] = []
  for (const segment of segments) {
    let value: string
    try {
      value = decodeURIComponent(segment)
    } catch {
      return null
    }
    if (value.includes('/')) {
      return null
    }
    decoded.push(value)
  }
  return decoded
}
