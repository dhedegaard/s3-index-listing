import { Metadata, ResolvingMetadata } from 'next'
import Link from 'next/link'
import { RedirectType, notFound, redirect } from 'next/navigation'
import { memo, use } from 'react'
import { type BucketContentResponse, getBucketContent } from '../../clients/s3-client'
import { NameTd } from '../../components/name-td'

export async function generateMetadata(props: Props, parent: ResolvingMetadata): Promise<Metadata> {
  const [params, resolvedParent] = await Promise.all([props.params, parent])
  const parentTitle = resolvedParent.title?.absolute ?? ''

  return {
    title: `${parentTitle} - ${
      Array.isArray(params.prefix) ? `/${params.prefix?.join('/')}` : 'Root'
    }`,
  } satisfies Metadata
}

// Cache for 30 minutes.
export const revalidate = 1800

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
            <Link prefetch={false} href={`/${prefix.prefix}`} className='text-blue-800'>
              {prefix.label}
            </Link>
          </NameTd>
          <td></td>
          <td align="right"></td>
        </tr>
      ))}
      {contents.map((content) => (
        <ContentRow key={`content-${content.Key}`} content={content}  />
      ))}
    </>
  )
})

const ContentRow = memo<{ content: BucketContentResponse['contents'][number] }>(
  function ContentRow({ content }) {
    return (
      <tr>
        <NameTd>
          <a href={`/${content.Key}`} className='text-blue-800'>{content.label}</a>
        </NameTd>
        <td className="whitespace-nowrap">
          {new Date(content.LastModified).toLocaleString()}
        </td>
        <td className="whitespace-nowrap" align="right">
          {content.Size.toLocaleString()}
        </td>
      </tr>
    )
  }
)
