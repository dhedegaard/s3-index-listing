import { GetObjectCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { SERVER_ENV } from '../server-env'

export interface BucketContentResponse {
  type: 'prefix-response'
  region: string
  bucket: string
  prefix: string
  prefixes: Array<{
    prefix: string
    label: string
  }>
  contents: Array<{
    Key: string
    label: string
    LastModified: string
    Size: number
  }>
}

export interface BucketContentObjectResponse {
  type: 'object-response'
  signedUrl: string
}

export interface BucketContentNotFoundResponse {
  type: 'not-found'
}

export const getBucketContent = async (
  pathname: string
): Promise<BucketContentResponse | BucketContentObjectResponse | BucketContentNotFoundResponse> => {
  const region = SERVER_ENV.S3_REGION
  const Bucket = SERVER_ENV.S3_BUCKET
  const s3 = new S3Client({
    region,
    credentials: {
      accessKeyId: SERVER_ENV.ACCESS_KEY,
      secretAccessKey: SERVER_ENV.SECRET_ACCESS_KEY,
    },
  })

  const prefix = pathname.length < 2 ? '' : pathname + '/'

  const { CommonPrefixes, Contents, $metadata } = await s3.send(
    new ListObjectsV2Command({
      Bucket,
      MaxKeys: 1_000,
      Delimiter: '/',
      Prefix: prefix,
    })
  )

  if (
    (CommonPrefixes != null && CommonPrefixes.length > 0) ||
    (Contents != null && Contents.length > 0)
  ) {
    return {
      type: 'prefix-response',
      region,
      bucket: Bucket,
      prefix,
      prefixes:
        CommonPrefixes?.map((e) => ({
          label: e.Prefix?.slice(prefix.length) ?? '',
          prefix: e.Prefix!,
        })) ?? [],
      contents:
        Contents?.filter((e) => e.Key != null).map((e) => ({
          ...e,
          Key: e.Key!,
          LastModified: e.LastModified!.toISOString(),
          Size: e.Size ?? 0,
          label: e.Key?.slice(prefix.length) ?? '',
        })) ?? [],
    } satisfies BucketContentResponse
  }

  // No prefixes or contents found but still a 200 response, so it's probably an object.
  if ($metadata.httpStatusCode === 200 && pathname.length >= 2) {
    const signedUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket, Key: pathname }), {
      expiresIn: 60,
    })
    return { type: 'object-response', signedUrl } satisfies BucketContentObjectResponse
  }

  // Explicit 404 case.
  return { type: 'not-found' } satisfies BucketContentNotFoundResponse
}
