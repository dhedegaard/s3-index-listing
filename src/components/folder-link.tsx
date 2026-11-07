import Link from 'next/link'
import type { ReactNode } from 'react'
import { keyHref } from '../key-path'
import { PendingLabel } from './pending-label'

interface FolderLinkProps {
  /** S3 prefix, unencoded; '' is the root. */
  prefix: string
  children: ReactNode
}

// No prefetch: each one would cost a function invocation and possibly an S3 LIST.
export function FolderLink({ prefix, children }: FolderLinkProps) {
  return (
    <Link prefetch={false} href={keyHref(prefix)} className="text-blue-800">
      <PendingLabel>{children}</PendingLabel>
    </Link>
  )
}
