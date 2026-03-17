import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { docFolder } from '@/db/schema'
import { eq, isNull } from 'drizzle-orm'

// PUT /api/docs/folders/:folderId - 폴더 이름 수정 또는 이동
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  const { folderId } = await params
  const id = Number(folderId)
  const body = await req.json()
  const { name, parentId } = body as { name?: string; parentId?: number | null }

  // 이동 요청 (parentId가 명시적으로 전달된 경우)
  if (parentId !== undefined) {
    // 순환 참조 방지: 자기 자신 또는 자신의 하위 폴더로 이동 불가
    if (parentId === id) {
      return NextResponse.json({ error: '자기 자신으로 이동할 수 없습니다.' }, { status: 400 })
    }
    if (parentId !== null) {
      // 대상 폴더가 현재 폴더의 하위인지 확인
      let current: number | null = parentId
      while (current !== null) {
        const parent = db.select().from(docFolder).where(eq(docFolder.id, current)).get()
        if (!parent) break
        if (parent.parentId === id) {
          return NextResponse.json({ error: '하위 폴더로 이동할 수 없습니다.' }, { status: 400 })
        }
        current = parent.parentId
      }
    }
    // 대상 폴더의 자식 중 마지막 sortOrder 계산
    const siblings = parentId === null
      ? db.select().from(docFolder).where(isNull(docFolder.parentId)).all()
      : db.select().from(docFolder).where(eq(docFolder.parentId, parentId)).all()
    const maxOrder = siblings.reduce((m, f) => Math.max(m, f.sortOrder), -1)

    db.update(docFolder)
      .set({ parentId: parentId, sortOrder: maxOrder + 1, updatedAt: new Date().toISOString() })
      .where(eq(docFolder.id, id))
      .run()

    return NextResponse.json({ ok: true })
  }

  // 이름 변경 요청
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
