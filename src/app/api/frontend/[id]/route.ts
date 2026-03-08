import { NextResponse } from 'next/server'
import { db } from '@/db'
import { frontendPost, frontendComment, frontendStep } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)

  const post = db.select().from(frontendPost).where(eq(frontendPost.id, postId)).get()
  if (!post) {
    return NextResponse.json({ error: '게시글이 존재하지 않습니다.' }, { status: 404 })
  }

  const comments = db
    .select()
    .from(frontendComment)
    .where(eq(frontendComment.postId, postId))
    .orderBy(asc(frontendComment.createdAt))
    .all()

  const steps = db
    .select()
    .from(frontendStep)
    .where(eq(frontendStep.postId, postId))
    .orderBy(asc(frontendStep.stepOrder))
    .all()

  return NextResponse.json({ ...post, comments, steps })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  const body = await req.json()
  const { category, title, mmdContent, steps } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  db.update(frontendPost)
    .set({
      category: category || 'COMMON',
      title: title.trim(),
      content: '',
      mmdContent: mmdContent || null,
      updatedAt: now,
    })
    .where(eq(frontendPost.id, postId))
    .run()

  db.delete(frontendStep).where(eq(frontendStep.postId, postId)).run()
  if (steps && Array.isArray(steps)) {
    const validSteps = (steps as { title?: string; content: string }[]).filter((s) => s.content?.trim())
    for (let i = 0; i < validSteps.length; i++) {
      db.insert(frontendStep).values({
        postId,
        stepOrder: i + 1,
        title: validSteps[i].title?.trim() || null,
        content: validSteps[i].content.trim(),
      }).run()
    }
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  db.delete(frontendPost).where(eq(frontendPost.id, postId)).run()
  return NextResponse.json({ ok: true })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  const body = await req.json()
  const { content, author } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: '댓글 내용을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  db.insert(frontendComment)
    .values({
      postId,
      content: content.trim(),
      author: author || 'admin',
      createdAt: now,
    })
    .run()

  return NextResponse.json({ ok: true })
}
