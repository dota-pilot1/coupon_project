import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { taskPost, taskBlock } from '@/db/schema'
import { eq } from 'drizzle-orm'

// GET /api/tasks/posts/:postId
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  const post = db.select().from(taskPost).where(eq(taskPost.id, Number(postId))).get()
  if (!post) return NextResponse.json({ error: 'Task를 찾을 수 없습니다.' }, { status: 404 })

  let blocks = db.select().from(taskBlock).where(eq(taskBlock.postId, post.id)).orderBy(taskBlock.sortOrder).all()

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

// PUT /api/tasks/posts/:postId
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

  db.update(taskPost)
    .set({ title: title.trim(), updatedAt: new Date().toISOString() })
    .where(eq(taskPost.id, Number(postId)))
    .run()

  db.delete(taskBlock).where(eq(taskBlock.postId, Number(postId))).run()
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
    db.insert(taskBlock).values(insertData).run()
  }

  return NextResponse.json({ ok: true })
}

// DELETE /api/tasks/posts/:postId
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { postId } = await params
  db.delete(taskPost).where(eq(taskPost.id, Number(postId))).run()
  return NextResponse.json({ ok: true })
}
