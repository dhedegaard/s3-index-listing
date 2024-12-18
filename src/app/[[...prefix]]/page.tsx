import { Metadata, ResolvingMetadata } from 'next'
import Link from 'next/link'
import { RedirectType, notFound, redirect } from 'next/navigation'
import { HTMLProps, memo, use, useMemo } from 'react'
import { BucketContentResponse, getBucketContent } from '../../clients/s3-client'

export const runtime = 'edge'

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params
  const parentTitle = (await parent).title?.absolute ?? ''

  return {
    title: `${parentTitle} - ${
      Array.isArray(params.prefix) ? `/${params.prefix?.join('/')}` : 'Root'
    }`,
  } satisfies Metadata
}
// Cache for 10 minutes.
export const revalidate = 600

const NameTd = memo(function NameTd(props: HTMLProps<HTMLTableCellElement>) {
  return <td {...props} className="w-full overflow-hidden text-ellipsis text-left" />
})

interface Props {
  params: Promise<{ prefix: undefined | string[] }>
}
export default function Index(props: Readonly<Props>) {
  const params = use(props.params)
  const data = use(getBucketContent(params.prefix?.join('/') ?? '/'))
  if (data.type === 'not-found') {
    notFound()
  }

  if (data.type === 'object-response') {
    return redirect(data.signedUrl, RedirectType.push)
  }

  return <PrefixRenderer {...data} />
}

const PrefixRenderer = memo<BucketContentResponse>(function PrefixRenderer({
  prefix,
  prefixes,
  contents,
}) {
  const parentPrefix = useMemo(() => {
    if (prefix === '') {
      return null
    }
    const parts = prefix.split('/').filter((e) => e !== '')
    return `/${parts.slice(0, parts.length - 1).join('/')}`
  }, [prefix])

  return (
    <main className="mx-auto max-w-5xl px-2">
      <h1>{prefix === '' ? 'Root' : <>Prefix: {prefix}</>}</h1>
      <hr />
      <table cellSpacing="5">
        <thead>
          <tr>
            <NameTd>Name</NameTd>
            <th className="whitespace-nowrap" align="left">
              Last modified
            </th>
            <th align="right">Size</th>
          </tr>
        </thead>
        <tbody>
          {typeof parentPrefix === 'string' && (
            <tr>
              <NameTd>
                <Link href={parentPrefix}>..</Link>
              </NameTd>
              <td></td>
              <td align="right"></td>
            </tr>
          )}
          {prefixes.map((e) => (
            <tr key={`prefix-${e.prefix}`}>
              <NameTd>
                <Link prefetch={false} href={`/${e.prefix}`}>
                  {e.label}
                </Link>
              </NameTd>
              <td></td>
              <td align="right"></td>
            </tr>
          ))}
          {contents.map((e) => (
            <tr key={`content-${e.Key}`}>
              <NameTd>
                <a href={e.Key}>{e.label}</a>
              </NameTd>
              <td className="whitespace-nowrap">{new Date(e.LastModified).toLocaleString()}</td>
              <td className="whitespace-nowrap" align="right">
                {e.Size.toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  )
})
