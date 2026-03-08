import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { docFolder } from '@/db/schema'
import { eq } from 'drizzle-orm'

// PUT /api/docs/folders/:folderId - 폴더 이름 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params
  const id = Number(folderId)
  const body = await req.json()
  const { name } = body as { name: string }
  if (!name?.trim()) return NextResponse.json({ error: '폴더명을 입력하세요.' }, { status: 400 })

  db.update(docFolder)
    .set({ name: name.trim(), updatedAt: new Date().toISOString() })
    .where(eq(docFolder.id, id))
    .run()

  return NextResponse.json({ ok: true })
}

// DELETE /api/docs/folders/:folderId - 폴더 삭제 (하위 문서 cascade)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params
  const id = Number(folderId)

  db.delete(docFolder).where(eq(docFolder.id, id)).run()

  return NextResponse.json({ ok: true })
}
