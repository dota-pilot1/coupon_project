import { NextResponse } from 'next/server'
import { db } from '@/db'
import { reviewPost, reviewComment } from '@/db/schema'
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

  return NextResponse.json({ ...post, comments })
}

// 게시글 수정
export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const postId = Number(id)
  const body = await req.json()
  const { category, title, content, mmdContent } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  db.update(reviewPost)
    .set({
      category: category || 'COMMON',
      title: title.trim(),
      content: (content || '').trim(),
      mmdContent: mmdContent || null,
      updatedAt: now,
    })
    .where(eq(reviewPost.id, postId))
    .run()

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
