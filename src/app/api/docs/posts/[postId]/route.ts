import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { docPost } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/docs/posts/:postId - 문서 상세
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  const post = db.select().from(docPost).where(eq(docPost.id, Number(postId))).get()
  if (!post) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })
  return NextResponse.json(post)
}

// PUT /api/docs/posts/:postId - 문서 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  const body = await req.json()
  const { title, content, contentType } = body as {
    title: string
    content: string
    contentType: 'NOTE' | 'MMD' | 'FIGMA' | 'FILE'
  }
  if (!title?.trim()) return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })

  db.update(docPost)
    .set({ title: title.trim(), content, contentType, updatedAt: new Date().toISOString() })
    .where(eq(docPost.id, Number(postId)))
    .run()

  return NextResponse.json({ ok: true })
}

// DELETE /api/docs/posts/:postId - 문서 삭제
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  db.delete(docPost).where(eq(docPost.id, Number(postId))).run()
  return NextResponse.json({ ok: true })
}
