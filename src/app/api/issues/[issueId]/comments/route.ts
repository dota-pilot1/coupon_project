import { NextResponse } from 'next/server'
import { db } from '@/db'
import { issueComment } from '@/db/schema'
import { eq, desc } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const id = Number(issueId)

  const comments = db
    .select()
    .from(issueComment)
    .where(eq(issueComment.issueId, id))
    .orderBy(desc(issueComment.createdAt))
    .all()

  return NextResponse.json(comments)
}

export async function POST(req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const id = Number(issueId)
  const body = await req.json()
  const { content, author } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: '댓글 내용을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const result = db
    .insert(issueComment)
    .values({
      issueId: id,
      content: content.trim(),
      author: author || 'admin',
      createdAt: now,
    })
    .run()

  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}
