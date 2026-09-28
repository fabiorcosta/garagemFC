import { S3Client } from "@aws-sdk/client-s3"

export const s3Config = {
  bucket: process.env.S3_BUCKET ?? "",
  region: process.env.S3_REGION || "us-east-1",
  endpoint: process.env.S3_ENDPOINT || undefined,
}

/** Sem bucket configurado, as fotos ficam em disco (.uploads/) — só para desenvolvimento. */
export const useLocalStorage = !s3Config.bucket

let client: S3Client | null = null

export function getS3Client() {
  if (!client) {
    client = new S3Client({
      region: s3Config.region,
      endpoint: s3Config.endpoint,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? "",
      },
    })
  }
  return client
}
