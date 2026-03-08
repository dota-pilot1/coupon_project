import { NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaPost } from '@/db/schema'
import { desc, like, eq, and } from 'drizzle-orm'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const keyword = searchParams.get('keyword')

  const conditions = []
  if (category && category !== 'ALL') conditions.push(eq(figmaPost.category, category))
  if (keyword) conditions.push(like(figmaPost.title, `%${keyword}%`))

  const list = db
    .select()
    .from(figmaPost)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(figmaPost.createdAt))
    .all()

  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { category, title, figmaUrl, description, author } = body

  if (!title?.trim()) {
    return NextResponse.json({ error: '제목을 입력하세요.' }, { status: 400 })
  }
  if (!figmaUrl?.trim()) {
    return NextResponse.json({ error: 'Figma URL을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const result = db
    .insert(figmaPost)
    .values({
      category: category || 'COMMON',
      title: title.trim(),
      figmaUrl: figmaUrl.trim(),
      description: description?.trim() || null,
      author: author || 'admin',
      createdAt: now,
      updatedAt: now,
    })
    .run()

  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}
