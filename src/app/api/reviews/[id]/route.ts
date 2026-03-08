import { NextResponse } from 'next/server'
import { db } from '@/db'
import { reviewPost, reviewComment, reviewStep } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

// 게시글 상세 + 댓글 조회
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)

  const post = db.select().from(reviewPost).where(eq(reviewPost.id, postId)).get()
  if (!post) {
    return NextResponse.json({ error: '게시글이 존재하지 않습니다.' }, { status: 404 })
  }

  const comments = db
    .select()
    .from(reviewComment)
    .where(eq(reviewComment.postId, postId))
    .orderBy(asc(reviewComment.createdAt))
    .all()

  const steps = db
    .select()
    .from(reviewStep)
    .where(eq(reviewStep.postId, postId))
    .orderBy(asc(reviewStep.stepOrder))
    .all()

  return NextResponse.json({ ...post, comments, steps })
}

// 게시글 수정
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  const body = await req.json()
  const { category, title, mmdContent, steps } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  db.update(reviewPost)
    .set({
      category: category || 'COMMON',
      title: title.trim(),
      content: '',
      mmdContent: mmdContent || null,
      updatedAt: now,
    })
    .where(eq(reviewPost.id, postId))
    .run()

  db.delete(reviewStep).where(eq(reviewStep.postId, postId)).run()
  if (steps && Array.isArray(steps)) {
    const validSteps = (steps as { title?: string; content: string }[]).filter((s) => s.content?.trim())
    for (let i = 0; i < validSteps.length; i++) {
      db.insert(reviewStep).values({
        postId,
        stepOrder: i + 1,
        title: validSteps[i].title?.trim() || null,
        content: validSteps[i].content.trim(),
      }).run()
    }
  }

  return NextResponse.json({ ok: true })
}

// 게시글 삭제
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)

  db.delete(reviewPost).where(eq(reviewPost.id, postId)).run()
  return NextResponse.json({ ok: true })
}

// 댓글 추가
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  const body = await req.json()
  const { content, author } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: '댓글 내용을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  db.insert(reviewComment)
    .values({
      postId,
      content: content.trim(),
      author: author || 'admin',
      createdAt: now,
    })
    .run()

  return NextResponse.json({ ok: true })
}
