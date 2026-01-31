import Link from 'next/link'
import { use, useMemo, type ReactNode } from 'react'
import { z } from 'zod'
import { NameTd } from '../../components/name-td'

interface Props extends LayoutProps<'/[[...prefix]]'> {
  children: ReactNode
}

const Params = z.object({
  prefix: z.optional(z.array(z.string().min(1)).readonly()),
})

export default function IndexLayout({ children, params: unresolvedParams }: Props) {
  const paramsResult = use(
    unresolvedParams.then(async (params) => await Params.safeParseAsync(params))
  )

  const parentPrefix = useMemo(() => {
    if (
      !paramsResult.success ||
      paramsResult.data.prefix == null ||
      paramsResult.data.prefix.length === 0
    ) {
      return null
    }

    return `/${paramsResult.data.prefix
      .slice(0, -1)
      .map((part) => encodeURIComponent(part))
      .join('/')}`
  }, [paramsResult])

  if (!paramsResult.success) {
    throw paramsResult.error
  }
  const { prefix } = paramsResult.data

  return (
    <main className="mx-auto max-w-5xl px-2">
      <h1>{prefix == null || prefix.length === 0 ? 'Root' : <>Prefix: {prefix.join('/')}</>}</h1>
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
                  <Link prefetch={false} href={parentPrefix} className="text-blue-800">
                    ..
                  </Link>
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
