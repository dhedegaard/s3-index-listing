import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { unstable_cache } from 'next/cache'
import { cache } from 'react'
import * as z from 'zod'
import { SERVER_ENV } from '../server-env'

const listedObjectSchema = z.object({
  Key: z.string(),
  LastModified: z.iso.datetime(),
  Size: z.number().int().nonnegative(),
})
interface ListedObject extends z.infer<typeof listedObjectSchema> {}

interface PrefixEntry {
  prefix: string
  label: string
}

interface ContentEntry extends ListedObject {
  label: string
}

export interface BucketContentResponse {
  type: 'prefix-response'
  region: string
  bucket: string
  prefix: string
  prefixes: PrefixEntry[]
  contents: ContentEntry[]
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

// Compiled: parsed on every listing read, several times per request.
const listingSchema = z.compile(
  z.object({
    prefixes: z.array(z.string()),
    objects: z.array(listedObjectSchema),
    isTruncated: z.boolean(),
  })
)
interface Listing extends z.infer<typeof listingSchema> {}

// LIST requests are billed as Tier 1, so every distinct prefix is listed at most once an hour.
// Only a JSON-safe projection is cached; it's parsed on the way out, since the data cache is a
// runtime boundary.
const listPrefixCached = unstable_cache(
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
                } satisfies ListedObject,
              ]
        ) ?? [],
      isTruncated: IsTruncated === true,
    } satisfies Listing
  },
  ['s3-list-objects-v2', SERVER_ENV.S3_BUCKET],
  { revalidate: 3600 }
)

async function listPrefix(prefix: string): Promise<Listing> {
  return listingSchema.parse(await listPrefixCached(prefix))
}

type EntryKind = 'prefix' | 'object' | 'missing' | 'unknown'

/**
 * Looks up each segment in its parent's listing, so URLs that can't exist (bots, scanners) are
 * rejected from cached listings without a LIST of their own. A truncated listing can't prove
 * absence, hence 'unknown'.
 */
async function getEntryKind(segments: readonly string[]): Promise<EntryKind> {
  let kind: EntryKind = 'prefix'
  let parentPrefix = ''
  for (const [index, segment] of segments.entries()) {
    const path = parentPrefix + segment
    const { prefixes, objects, isTruncated } = await listPrefix(parentPrefix)
    if (prefixes.includes(path + '/')) {
      kind = 'prefix'
    } else if (objects.some((e) => e.Key === path)) {
      return index === segments.length - 1 ? 'object' : 'missing'
    } else if (isTruncated) {
      kind = 'unknown'
    } else {
      return 'missing'
    }
    parentPrefix = path + '/'
  }
  return kind
}

// Takes the path as a string because React `cache` matches arguments by identity.
export const getBucketContent = cache(async function getBucketContent(
  path: string
): Promise<BucketContentResponse | BucketContentObjectResponse | BucketContentNotFoundResponse> {
  const prefix = path === '' ? '' : path + '/'
  // The trailing '/' leaves an empty last element; dropping it also gives [] for the root.
  const kind = await getEntryKind(prefix.split('/').slice(0, -1))
  if (kind === 'missing') {
    return { type: 'not-found' } satisfies BucketContentNotFoundResponse
  }
  if (kind === 'object') {
    return await getObjectResponse(path)
  }

  const { prefixes, objects } = await listPrefix(prefix)
  if (prefixes.length > 0 || objects.length > 0) {
    return {
      type: 'prefix-response',
      region: SERVER_ENV.S3_REGION,
      bucket: SERVER_ENV.S3_BUCKET,
      prefix,
      prefixes: prefixes.map(
        (e) => ({ prefix: e, label: e.slice(prefix.length) }) satisfies PrefixEntry
      ),
      contents: objects.map(
        (e) => ({ ...e, label: e.Key.slice(prefix.length) }) satisfies ContentEntry
      ),
    } satisfies BucketContentResponse
  }

  // A truncated parent listing can't rule out an object at this key.
  if (kind === 'unknown') {
    return await getObjectResponse(path)
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
