import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { docPost, docBlock } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/docs/posts/:postId - 문서 상세
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  const post = db.select().from(docPost).where(eq(docPost.id, Number(postId))).get()
  if (!post) return NextResponse.json({ error: '문서를 찾을 수 없습니다.' }, { status: 404 })

  let blocks = db.select().from(docBlock).where(eq(docBlock.postId, post.id)).orderBy(docBlock.sortOrder).all()

  // 하위 호환성 처리 (기존 데이터가 docBlock에 없는 경우 docPost.content를 임시 블록으로 매핑)
  if (blocks.length === 0 && post.content) {
    blocks = [
      {
        id: -1,
        postId: post.id,
        blockType: post.contentType || 'NOTE',
        content: post.content,
        sortOrder: 0,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
      },
    ] as any
  }

  return NextResponse.json({ ...post, blocks })
}

// PUT /api/docs/posts/:postId - 문서 수정
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  const body = await req.json()
  const { title, blocks } = body as {
    title: string
    blocks: { blockType: string; content: string }[]
  }
  if (!title?.trim()) return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })

  db.update(docPost)
    .set({ title: title.trim(), updatedAt: new Date().toISOString() })
    .where(eq(docPost.id, Number(postId)))
    .run()

  // 블록 새로 생성 (단순 덮어쓰기)
  db.delete(docBlock).where(eq(docBlock.postId, Number(postId))).run()
  if (blocks && blocks.length > 0) {
    const now = new Date().toISOString()
    const insertData = blocks.map((b, idx) => ({
      postId: Number(postId),
      blockType: b.blockType || 'NOTE',
      content: b.content || '',
      sortOrder: idx,
      createdAt: now,
      updatedAt: now,
    }))
    db.insert(docBlock).values(insertData).run()
  }

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
