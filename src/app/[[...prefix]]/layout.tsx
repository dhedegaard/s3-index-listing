import { use, type ReactNode } from 'react'
import * as z from 'zod'
import { FolderLink } from '../../components/folder-link'
import { NameTd } from '../../components/name-td'
import { displaySegments } from '../../key-path'

interface Props extends LayoutProps<'/[[...prefix]]'> {
  children: ReactNode
}

// Compiled: parsed on every request.
const Params = z.compile(
  z.object({
    prefix: z.optional(z.array(z.string().min(1)).readonly()),
  })
)

export default function IndexLayout({ children, params: unresolvedParams }: Props) {
  const paramsResult = Params.safeParse(use(unresolvedParams))

  if (!paramsResult.success) {
    throw paramsResult.error
  }
  const prefix = displaySegments(paramsResult.data.prefix)
  const parentPrefix = prefix.length === 0 ? null : prefix.slice(0, -1).join('/')

  return (
    <main className="mx-auto max-w-5xl px-2">
      <h1>{prefix.length === 0 ? 'Root' : <>Prefix: {prefix.join('/')}</>}</h1>
      <hr />
      <div className="w-full overflow-x-auto">
        <table cellSpacing="5" className="w-full">
          <thead>
            <tr>
              <th className="w-auto text-left">Name</th>
              <th className="w-[200px] text-left">Last modified</th>
              <th className="w-[100px] text-right">Size</th>
            </tr>
          </thead>
          <tbody>
            {typeof parentPrefix === 'string' && (
              <tr>
                <NameTd>
                  <FolderLink prefix={parentPrefix}>..</FolderLink>
                </NameTd>
                <td></td>
                <td align="right"></td>
              </tr>
            )}
            {children}
          </tbody>
        </table>
      </div>
    </main>
  )
}
