'use client'

import { useLinkStatus } from 'next/link'
import type { ReactNode } from 'react'

interface PendingLabelProps {
  children: ReactNode
}

/**
 * Feedback for a folder click while the next listing loads. The route has no Suspense boundary (it
 * would lock the status at 200), so nothing else shows that a click registered. Everything is
 * always rendered, so nothing shifts, and the delay keeps cached navigations from flashing it. The
 * label dims as well, since a long name can push the spinner out of view.
 */
export function PendingLabel({ children }: PendingLabelProps) {
  const { pending } = useLinkStatus()
  return (
    <>
      <span className={`transition-opacity ${pending ? 'opacity-60 delay-150' : ''}`}>
        {children}
      </span>
      <span
        aria-hidden
        className={`ml-1.5 inline-block size-3 rounded-full border-2 border-current border-t-transparent align-middle transition-opacity ${
          pending ? 'delay-150 motion-safe:animate-spin' : 'opacity-0'
        }`}
      />
      <span role="status" className="sr-only">
        {pending ? 'Loading' : ''}
      </span>
    </>
  )
}
