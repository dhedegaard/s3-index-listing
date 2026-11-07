'use client'

import { useLinkStatus } from 'next/link'

/**
 * Feedback for a folder click while the next listing loads. The route has no Suspense boundary (it
 * would lock the status at 200), so nothing else shows that a click registered. Always rendered,
 * so it never shifts layout; the delay keeps cached navigations from flashing it.
 */
export function PendingHint() {
  const { pending } = useLinkStatus()
  return (
    <span
      aria-hidden
      className={`ml-1.5 inline-block size-3 rounded-full border-2 border-current border-t-transparent align-middle transition-opacity ${
        pending ? 'animate-spin opacity-100 delay-150' : 'opacity-0'
      }`}
    />
  )
}
