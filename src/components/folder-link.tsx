import Link from 'next/link'
import type { ReactNode } from 'react'
import { PendingHint } from './pending-hint'

interface FolderLinkProps {
  href: string
  children: ReactNode
}

// No prefetch: each one would cost a function invocation and possibly an S3 LIST.
export function FolderLink({ href, children }: FolderLinkProps) {
  return (
    <Link prefetch={false} href={href} className="text-blue-800">
      {children}
      <PendingHint />
    </Link>
  )
}
