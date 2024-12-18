import { Metadata, ResolvingMetadata } from 'next'
import Link from 'next/link'
import { RedirectType, notFound, redirect } from 'next/navigation'
import { memo, use, useMemo } from 'react'
import { BucketContentResponse, getBucketContent } from '../../clients/s3-client'
import { NameTd } from '../../components/name-td'

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
          {useMemo(() => new Date(content.LastModified).toLocaleString(), [])}
        </td>
        <td className="whitespace-nowrap" align="right">
          {content.Size.toLocaleString()}
        </td>
      </tr>
    )
  }
)
