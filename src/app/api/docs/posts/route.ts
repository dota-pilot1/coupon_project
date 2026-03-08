import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { docPost } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

// GET /api/docs/posts?folderId=1 - 폴더별 문서 목록
export async function GET(req: NextRequest) {
  const folderId = req.nextUrl.searchParams.get('folderId')
  if (!folderId) return NextResponse.json({ error: 'folderId 필수' }, { status: 400 })

  const posts = db
    .select()
    .from(docPost)
    .where(eq(docPost.folderId, Number(folderId)))
    .orderBy(asc(docPost.sortOrder), asc(docPost.id))
    .all()

  return NextResponse.json(posts)
}

// POST /api/docs/posts - 문서 생성
export async function POST(req: NextRequest) {
  const body = await req.json()
  const { folderId, title, content, contentType } = body as {
    folderId: number
    title: string
    content: string
    contentType: 'MD' | 'MMD'
  }
  if (!folderId || !title?.trim()) {
    return NextResponse.json({ error: '폴더와 제목은 필수입니다.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const siblings = db.select().from(docPost).where(eq(docPost.folderId, folderId)).all()
  const maxOrder = siblings.reduce((m, p) => Math.max(m, p.sortOrder), -1)

  const [created] = db
    .insert(docPost)
    .values({
      folderId,
      title: title.trim(),
      content: content ?? '',
      contentType: contentType ?? 'MD',
      author: 'admin',
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    })
    .returning()
    .all()

  return NextResponse.json(created, { status: 201 })
}
