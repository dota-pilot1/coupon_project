import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { taskFolder } from '@/db/schema'
import { eq } from 'drizzle-orm'

// PUT /api/tasks/folders/:folderId
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params
  const id = Number(folderId)
  const body = await req.json()
  const { name } = body as { name: string }
  if (!name?.trim()) return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })

  db.update(taskFolder)
    .set({ name: name.trim(), updatedAt: new Date().toISOString() })
    .where(eq(taskFolder.id, id))
    .run()

  return NextResponse.json({ ok: true })
}

// DELETE /api/tasks/folders/:folderId
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params
  const id = Number(folderId)

  db.delete(taskFolder).where(eq(taskFolder.id, id)).run()

  return NextResponse.json({ ok: true })
}
