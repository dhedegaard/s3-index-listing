import { Metadata, ResolvingMetadata } from 'next'
import { unstable_cache } from 'next/cache'
import Link from 'next/link'
import { RedirectType, notFound, redirect } from 'next/navigation'
import { memo, use, useMemo } from 'react'
import { BucketContentResponse, getBucketContent } from '../../clients/s3-client'
import { NameTd } from '../../components/name-td'

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const params = await props.params
  const parentTitle = (await parent).title?.absolute ?? ''

  return {
    title: `${parentTitle} - ${
      Array.isArray(params.prefix) ? `/${params.prefix?.join('/')}` : 'Root'
    }`,
  } satisfies Metadata
}

// Cache for 30 minutes.
export const revalidate = 1800
export const runtime = 'edge'

interface Props {
  params: Promise<{ prefix: undefined | string[] }>
}

const cachedGetBucketContent = unstable_cache(
  (prefix: Awaited<Props['params']>['prefix'] | undefined) =>
    getBucketContent(prefix?.join('/') ?? '/'),
  ['list-bucket-by-params-from-page'],
  { revalidate: 3600 }
)
export default function Index(props: Readonly<Props>) {
  const params = use(props.params)
  const data = use(cachedGetBucketContent(params.prefix))
  if (data.type === 'not-found') {
    notFound()
  }

  if (data.type === 'object-response') {
    return redirect(data.signedUrl, RedirectType.push)
  }

  return <PrefixRenderer {...data} />
}

const PrefixRenderer = memo<BucketContentResponse>(function PrefixRenderer({ prefixes, contents }) {
  return (
    <>
      {prefixes.map((prefix) => (
        <tr key={`prefix-${prefix.prefix}`}>
          <NameTd>
            <Link prefetch={false} href={`/${prefix.prefix}`}>
              {prefix.label}
            </Link>
          </NameTd>
          <td></td>
          <td align="right"></td>
        </tr>
      ))}
      {contents.map((content) => (
        <ContentRow key={`content-${content.Key}`} content={content} />
      ))}
    </>
  )
})

const ContentRow = memo<{ content: BucketContentResponse['contents'][number] }>(
  function ContentRow({ content }) {
    return (
      <tr>
        <NameTd>
          <a href={`/${content.Key}`}>{content.label}</a>
        </NameTd>
        <td className="whitespace-nowrap">
          {useMemo(() => new Date(content.LastModified).toLocaleString(), [content.LastModified])}
        </td>
        <td className="whitespace-nowrap" align="right">
          {content.Size.toLocaleString()}
        </td>
      </tr>
    )
  }
)
