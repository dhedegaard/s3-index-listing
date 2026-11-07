import { Metadata, ResolvingMetadata } from 'next'
import { RedirectType, notFound, redirect } from 'next/navigation'
import { memo, use } from 'react'
import { type BucketContentResponse, getBucketContent } from '../../clients/s3-client'
import { FolderLink } from '../../components/folder-link'
import { NameTd } from '../../components/name-td'
import { decodeSegments, keyHref } from '../../key-path'

export async function generateMetadata(
  props: PageProps<'/[[...prefix]]'>,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const [params, resolvedParent] = await Promise.all([props.params, parent])
  const parentTitle = resolvedParent.title?.absolute ?? ''
  const rawPrefix = params.prefix ?? []
  const prefix = decodeSegments(rawPrefix) ?? rawPrefix

  return {
    title: `${parentTitle} - ${prefix.length === 0 ? 'Root' : `/${prefix.join('/')}`}`,
  } satisfies Metadata
}

export default function Index(props: PageProps<'/[[...prefix]]'>) {
  const params = use(props.params)
  const segments = decodeSegments(params.prefix ?? [])
  if (segments == null) {
    notFound()
  }
  const data = use(getBucketContent(segments.join('/')))
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
            <FolderLink prefix={prefix.prefix}>{prefix.label}</FolderLink>
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
          <a href={keyHref(content.Key)} className="text-blue-800">
            {content.label}
          </a>
        </NameTd>
        <td className="whitespace-nowrap">{new Date(content.LastModified).toLocaleString()}</td>
        <td className="whitespace-nowrap" align="right">
          {content.Size.toLocaleString()}
        </td>
      </tr>
    )
  }
)
