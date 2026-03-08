import { NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaChecklist } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(_req: Request, { params }: { params: Promise<{ figmaId: string; checkId: string }> }) {
  const { checkId } = await params
  const id = Number(checkId)

  const item = db.select().from(figmaChecklist).where(eq(figmaChecklist.id, id)).get()
  if (!item) return NextResponse.json({ error: '항목 없음' }, { status: 404 })

  db.update(figmaChecklist)
    .set({ checked: item.checked === 1 ? 0 : 1 })
    .where(eq(figmaChecklist.id, id))
    .run()

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ figmaId: string; checkId: string }> }) {
  const { checkId } = await params
  const id = Number(checkId)

  db.delete(figmaChecklist).where(eq(figmaChecklist.id, id)).run()
  return NextResponse.json({ ok: true })
}
