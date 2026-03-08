import { NextResponse } from 'next/server'
import { db } from '@/db'
import { issuePost } from '@/db/schema'
import { desc, like, eq, and } from 'drizzle-orm'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const status = searchParams.get('status')
  const keyword = searchParams.get('keyword')

  const conditions = []
  if (category && category !== 'ALL') conditions.push(eq(issuePost.category, category))
  if (status && status !== 'ALL') conditions.push(eq(issuePost.status, status))
  if (keyword) conditions.push(like(issuePost.title, `%${keyword}%`))

  const list = db
    .select()
    .from(issuePost)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(issuePost.createdAt))
    .all()

  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { category, title, content, status, priority, author } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })
  }
  if (!content?.trim()) {
    return NextResponse.json({ error: '내용을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const result = db
    .insert(issuePost)
    .values({
      category: category || 'COMMON',
      title: title.trim(),
      content: content.trim(),
      status: status || 'OPEN',
      priority: priority || 'MEDIUM',
      author: author || 'admin',
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}
