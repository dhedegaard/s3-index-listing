import { z } from "zod";

const serverEnvSchema = z.object({
  S3_REGION: z.string().min(1),
  S3_BUCKET: z.string().min(1),
  ACCESS_KEY: z.string().min(1),
  SECRET_ACCESS_KEY: z.string().min(1),
});
export const SERVER_ENV = serverEnvSchema.parse(
  Object.fromEntries(
    Object.keys(serverEnvSchema.shape).map((key) => [key, process.env[key]])
  )
);
