import { NextResponse } from 'next/server'
import { db } from '@/db'
import { issueImage } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { deleteS3Object } from '@/lib/s3'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ issueId: string; imageId: string }> }
) {
  const { imageId } = await params
  const id = Number(imageId)

  const image = db.select().from(issueImage).where(eq(issueImage.id, id)).get()
  if (!image) {
    return NextResponse.json({ error: '이미지가 존재하지 않습니다.' }, { status: 404 })
  }

  // S3에서 삭제
  try {
    const url = new URL(image.url)
    const key = url.pathname.slice(1) // 앞의 / 제거
    await deleteS3Object(key)
  } catch {
    // S3 삭제 실패해도 DB는 삭제 진행
  }

  db.delete(issueImage).where(eq(issueImage.id, id)).run()
  return NextResponse.json({ ok: true })
}
