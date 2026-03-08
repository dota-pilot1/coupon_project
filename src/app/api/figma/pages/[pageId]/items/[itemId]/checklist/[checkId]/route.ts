import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaChecklist } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string; itemId: string; checkId: string }> }
) {
  const { checkId } = await params
  const body = await req.json()
  const [updated] = await db
    .update(figmaChecklist)
    .set({ checked: body.checked ? 1 : 0 })
    .where(eq(figmaChecklist.id, parseInt(checkId)))
    .returning()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string; itemId: string; checkId: string }> }
) {
  const { checkId } = await params
  await db.delete(figmaChecklist).where(eq(figmaChecklist.id, parseInt(checkId)))
  return NextResponse.json({ success: true })
}
