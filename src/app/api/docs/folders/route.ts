import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { docFolder } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

// GET /api/docs/folders - 전체 폴더 트리 조회
export async function GET() {
  const folders = db
    .select()
    .from(docFolder)
    .orderBy(asc(docFolder.sortOrder), asc(docFolder.id))
    .all()
  return NextResponse.json(folders)
}

// POST /api/docs/folders - 폴더 생성
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, parentId } = body as { name: string; parentId?: number | null }
  if (!name?.trim()) return NextResponse.json({ error: '폴더명을 입력하세요.' }, { status: 400 })

  const now = new Date().toISOString()

  // sortOrder: 같은 parentId 내 max + 1
  const siblings = db
    .select()
    .from(docFolder)
    .where(parentId ? eq(docFolder.parentId, parentId) : eq(docFolder.parentId, docFolder.parentId))
    .all()
    .filter((f) => f.parentId === (parentId ?? null))

  const maxOrder = siblings.reduce((m, f) => Math.max(m, f.sortOrder), -1)

  const [created] = db
    .insert(docFolder)
    .values({ name: name.trim(), parentId: parentId ?? null, sortOrder: maxOrder + 1, createdAt: now, updatedAt: now })
    .returning()
    .all()

  return NextResponse.json(created, { status: 201 })
}
