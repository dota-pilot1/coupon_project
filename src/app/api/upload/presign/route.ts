import { NextResponse } from 'next/server'
import { createPresignedPutUrl, getPublicUrl } from '@/lib/s3'
import { randomUUID } from 'crypto'

export async function POST(req: Request) {
  const body = await req.json()
  const { filename, contentType } = body

  if (!filename || !contentType) {
    return NextResponse.json({ error: '파일명과 타입이 필요합니다.' }, { status: 400 })
  }

  if (!contentType.startsWith('image/')) {
    return NextResponse.json({ error: '이미지 파일만 업로드할 수 있습니다.' }, { status: 400 })
  }

  const ext = filename.split('.').pop()
  const key = `issues/${randomUUID()}.${ext}`
  const presignedUrl = await createPresignedPutUrl(key, contentType)
  const publicUrl = getPublicUrl(key)

  return NextResponse.json({ presignedUrl, publicUrl, key })
}
