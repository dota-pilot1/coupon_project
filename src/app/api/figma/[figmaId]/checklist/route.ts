import { NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaChecklist } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(req: Request, { params }: { params: Promise<{ figmaId: string }> }) {
  const { figmaId } = await params
  const id = Number(figmaId)
  const body = await req.json()
  const { content } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: '내용을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const result = db
    .insert(figmaChecklist)
    .values({ figmaId: id, content: content.trim(), checked: 0, createdAt: now })
    .run()

  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}
