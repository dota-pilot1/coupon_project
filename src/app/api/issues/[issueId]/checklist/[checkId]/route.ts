import { NextResponse } from 'next/server'
import { db } from '@/db'
import { issueChecklist } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(_req: Request, { params }: { params: Promise<{ checkId: string }> }) {
  const { checkId } = await params
  const id = Number(checkId)

  const item = db.select().from(issueChecklist).where(eq(issueChecklist.id, id)).get()
  if (!item) {
    return NextResponse.json({ error: '항목이 존재하지 않습니다.' }, { status: 404 })
  }

  db.update(issueChecklist)
    .set({ checked: item.checked === 0 ? 1 : 0 })
    .where(eq(issueChecklist.id, id))
    .run()

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ checkId: string }> }) {
  const { checkId } = await params
  const id = Number(checkId)

  db.delete(issueChecklist).where(eq(issueChecklist.id, id)).run()
  return NextResponse.json({ ok: true })
}
