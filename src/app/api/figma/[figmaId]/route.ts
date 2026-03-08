import { NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaPost, figmaChecklist } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ figmaId: string }> }) {
  const { figmaId } = await params
  const id = Number(figmaId)

  const post = db.select().from(figmaPost).where(eq(figmaPost.id, id)).get()
  if (!post) {
    return NextResponse.json({ error: '피그마 포스트가 존재하지 않습니다.' }, { status: 404 })
  }

  const checklist = db
    .select()
    .from(figmaChecklist)
    .where(eq(figmaChecklist.figmaId, id))
    .orderBy(asc(figmaChecklist.createdAt))
    .all()

  return NextResponse.json({ ...post, checklist })
}

export async function PUT(req: Request, { params }: { params: Promise<{ figmaId: string }> }) {
  const { figmaId } = await params
  const id = Number(figmaId)
  const body = await req.json()
  const { category, title, figmaUrl, description } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })
  }
  if (!figmaUrl?.trim()) {
    return NextResponse.json({ error: 'Figma URL을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  db.update(figmaPost)
    .set({
      category: category || 'COMMON',
      title: title.trim(),
      figmaUrl: figmaUrl.trim(),
      description: description?.trim() || null,
      updatedAt: now,
    })
    .where(eq(figmaPost.id, id))
    .run()

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ figmaId: string }> }) {
  const { figmaId } = await params
  const id = Number(figmaId)

  db.delete(figmaPost).where(eq(figmaPost.id, id)).run()
  return NextResponse.json({ ok: true })
}
