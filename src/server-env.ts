import * as z from 'zod'

const ServerEnv = z.object({
  /** @example `eu-west-1` */
  S3_REGION: z.string().min(1),
  /** @example `s3-bucket-name */
  S3_BUCKET: z.string().min(1),
  /**
   * IAM access key, with permissions to the bucket.
   *
   * @example `AIKA...`
   */
  ACCESS_KEY: z.string().min(1),
  /**
   * IAM secret access key, with permissions to the bucket.
   */
  SECRET_ACCESS_KEY: z.string().min(1),
})
export const SERVER_ENV = ServerEnv.parse(
  Object.fromEntries(Object.keys(ServerEnv.shape).map((key) => [key, process.env[key]]))
)
