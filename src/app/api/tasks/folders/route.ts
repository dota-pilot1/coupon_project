import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { taskFolder } from '@/db/schema'
import { eq, asc, isNull } from 'drizzle-orm'

// GET /api/tasks/folders
export async function GET() {
  const folders = db
    .select()
    .from(taskFolder)
    .orderBy(asc(taskFolder.sortOrder), asc(taskFolder.id))
    .all()
  return NextResponse.json(folders)
}

// POST /api/tasks/folders
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, parentId } = body as { name: string; parentId?: number | null }
  if (!name?.trim()) return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })

  const now = new Date().toISOString()

  const siblings = db
    .select()
    .from(taskFolder)
    .where(parentId ? eq(taskFolder.parentId, parentId) : isNull(taskFolder.parentId))
    .all()

  const maxOrder = siblings.reduce((m, f) => Math.max(m, f.sortOrder), -1)

  const [created] = db
    .insert(taskFolder)
    .values({ name: name.trim(), parentId: parentId ?? null, sortOrder: maxOrder + 1, createdAt: now, updatedAt: now })
    .returning()
    .all()

  return NextResponse.json(created, { status: 201 })
}
