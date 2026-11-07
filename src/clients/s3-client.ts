import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import { SERVER_ENV } from '../server-env'

export interface BucketContentResponse {
  type: 'prefix-response'
  region: string
  bucket: string
  prefix: string
  prefixes: Array<{ prefix: string; label: string }>
  contents: Array<{ Key: string; label: string; LastModified: string; Size: number }>
}

export interface BucketContentObjectResponse {
  type: 'object-response'
  signedUrl: string
}

export interface BucketContentNotFoundResponse {
  type: 'not-found'
}

const s3 = new S3Client({
  region: SERVER_ENV.S3_REGION,
  credentials: {
    accessKeyId: SERVER_ENV.ACCESS_KEY,
    secretAccessKey: SERVER_ENV.SECRET_ACCESS_KEY,
  },
})

interface Listing {
  prefixes: string[]
  objects: Array<{ Key: string; LastModified: string; Size: number }>
  isTruncated: boolean
}

// LIST requests are billed as Tier 1, so every distinct prefix is listed at most once an hour.
// Only a JSON-safe projection is cached, so its type matches what comes back out of the cache.
const listPrefix = cache(
  unstable_cache(
    async (prefix: string): Promise<Listing> => {
      const { CommonPrefixes, Contents, IsTruncated } = await s3.send(
        new ListObjectsV2Command({
          Bucket: SERVER_ENV.S3_BUCKET,
          MaxKeys: 1000,
          Delimiter: '/',
          Prefix: prefix,
        })
      )
      return {
        prefixes: CommonPrefixes?.flatMap((e) => (e.Prefix == null ? [] : [e.Prefix])) ?? [],
        objects:
          Contents?.flatMap((e) =>
            e.Key == null
              ? []
              : [
                  {
                    Key: e.Key,
                    LastModified: new Date(e.LastModified ?? 0).toISOString(),
                    Size: e.Size ?? 0,
                  },
                ]
          ) ?? [],
        isTruncated: IsTruncated === true,
      } satisfies Listing
    },
    ['s3-list-objects-v2', SERVER_ENV.S3_BUCKET],
    { revalidate: 3600 }
  )
)

const toPrefix = (segments: readonly string[]) =>
  segments.length === 0 ? '' : segments.join('/') + '/'

type EntryKind = 'prefix' | 'object' | 'missing' | 'unknown'

/**
 * Looks up each segment in its parent's listing, so URLs that can't exist (bots, scanners) are
 * rejected from cached listings without a LIST of their own. A truncated listing can't prove
 * absence, hence 'unknown'.
 */
async function getEntryKind(segments: readonly string[]): Promise<EntryKind> {
  let kind: EntryKind = 'prefix'
  for (let depth = 1; depth <= segments.length; depth++) {
    if (kind === 'object') {
      return 'missing'
    }
    const path = segments.slice(0, depth).join('/')
    const { prefixes, objects, isTruncated } = await listPrefix(
      toPrefix(segments.slice(0, depth - 1))
    )
    if (prefixes.includes(path + '/')) {
      kind = 'prefix'
    } else if (objects.some((e) => e.Key === path)) {
      kind = 'object'
    } else if (isTruncated) {
      kind = 'unknown'
    } else {
      return 'missing'
    }
  }
  return kind
}

export const getBucketContent = cache(async function getBucketContent(
  segments: readonly string[]
): Promise<BucketContentResponse | BucketContentObjectResponse | BucketContentNotFoundResponse> {
  const kind = await getEntryKind(segments)
  if (kind === 'missing') {
    return { type: 'not-found' } satisfies BucketContentNotFoundResponse
  }
  if (kind === 'object') {
    return await getObjectResponse(segments.join('/'))
  }

  const prefix = toPrefix(segments)
  const { prefixes, objects } = await listPrefix(prefix)
  if (prefixes.length > 0 || objects.length > 0) {
    return {
      type: 'prefix-response',
      region: SERVER_ENV.S3_REGION,
      bucket: SERVER_ENV.S3_BUCKET,
      prefix,
      prefixes: prefixes.map((e) => ({ prefix: e, label: e.slice(prefix.length) })),
      contents: objects.map((e) => ({ ...e, label: e.Key.slice(prefix.length) })),
    } satisfies BucketContentResponse
  }

  // Empty listing under a truncated parent: assume an object, as before.
  if (kind === 'unknown') {
    return await getObjectResponse(segments.join('/'))
  }

  return { type: 'not-found' } satisfies BucketContentNotFoundResponse
})

async function getObjectResponse(key: string): Promise<BucketContentObjectResponse> {
  const signedUrl = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: SERVER_ENV.S3_BUCKET, Key: key }),
    { expiresIn: 60 }
  )
  return { type: 'object-response', signedUrl } satisfies BucketContentObjectResponse
}
