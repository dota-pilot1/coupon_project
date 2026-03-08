import { NextResponse } from 'next/server'
import { db } from '@/db'
import { issueChecklist } from '@/db/schema'

export async function POST(req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const id = Number(issueId)
  const body = await req.json()
  const { content } = body

  if (!content?.trim()) {
    return NextResponse.json({ error: '내용을 입력하세요.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const result = db
    .insert(issueChecklist)
    .values({
      issueId: id,
      content: content.trim(),
      checked: 0,
      createdAt: now,
    })
    .run()

  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}
