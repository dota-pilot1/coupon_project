import { NextResponse } from 'next/server'
import { db } from '@/db'
import { frontendPost, frontendStep } from '@/db/schema'
import { desc, like, eq } from 'drizzle-orm'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const keyword = searchParams.get('keyword')

  let query = db
    .select()
    .from(frontendPost)
    .orderBy(desc(frontendPost.createdAt))
    .$dynamic()

  if (category && category !== 'ALL') {
    query = query.where(eq(frontendPost.category, category))
  }
  if (keyword) {
    query = query.where(like(frontendPost.title, `%${keyword}%`))
  }

  const list = query.all()
  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { category, title, author, mmdContent, steps } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })
  }
  if (!steps || !Array.isArray(steps) || steps.every((s: { content?: string }) => !s.content?.trim())) {
    return NextResponse.json({ error: '단계 내용을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const result = db.insert(frontendPost)
    .values({
      category: category || 'COMMON',
      title: title.trim(),
      content: '',
      author: author || 'admin',
      mmdContent: mmdContent || null,
      createdAt: now,
      updatedAt: now,
    })
    .run()

  const postId = Number(result.lastInsertRowid)
  const validSteps = (steps as { title?: string; content: string }[]).filter((s) => s.content?.trim())
  for (let i = 0; i < validSteps.length; i++) {
    db.insert(frontendStep).values({
      postId,
      stepOrder: i + 1,
      title: validSteps[i].title?.trim() || null,
      content: validSteps[i].content.trim(),
    }).run()
  }

  return NextResponse.json({ ok: true, id: postId })
}
