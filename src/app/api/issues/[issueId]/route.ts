import { NextResponse } from 'next/server'
import { db } from '@/db'
import { issuePost, issueChecklist } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const id = Number(issueId)

  const issue = db.select().from(issuePost).where(eq(issuePost.id, id)).get()
  if (!issue) {
    return NextResponse.json({ error: '이슈가 존재하지 않습니다.' }, { status: 404 })
  }

  const checklist = db
    .select()
    .from(issueChecklist)
    .where(eq(issueChecklist.issueId, id))
    .orderBy(asc(issueChecklist.createdAt))
    .all()

  return NextResponse.json({ ...issue, checklist })
}

export async function PUT(req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const id = Number(issueId)
  const body = await req.json()
  const { category, title, content, status, priority } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  db.update(issuePost)
    .set({
      category: category || 'COMMON',
      title: title.trim(),
      content: (content || '').trim(),
      status: status || 'OPEN',
      priority: priority || 'MEDIUM',
      updatedAt: now,
    })
    .where(eq(issuePost.id, id))
    .run()

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const id = Number(issueId)

  db.delete(issuePost).where(eq(issuePost.id, id)).run()
  return NextResponse.json({ ok: true })
}
