import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({
  region: process.env.AWS_S3_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.AWS_S3_BUCKET_NAME!
const REGION = process.env.AWS_S3_REGION!

export function getPublicUrl(key: string) {
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`
}

export async function createPresignedPutUrl(key: string, contentType: string) {
  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  })
  const url = await getSignedUrl(s3, command, { expiresIn: 300 })
  return url
}

export async function deleteS3Object(key: string) {
  const command = new DeleteObjectCommand({ Bucket: BUCKET, Key: key })
  await s3.send(command)
}
