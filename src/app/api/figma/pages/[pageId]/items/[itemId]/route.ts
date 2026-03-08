import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaItem } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string; itemId: string }> }
) {
  const { itemId } = await params
  const body = await req.json()
  const [updated] = await db
    .update(figmaItem)
    .set({
      title: body.title,
      figmaUrl: body.figmaUrl,
      version: body.version,
      author: body.author,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(figmaItem.id, parseInt(itemId)))
    .returning()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string; itemId: string }> }
) {
  const { itemId } = await params
  await db.delete(figmaItem).where(eq(figmaItem.id, parseInt(itemId)))
  return NextResponse.json({ success: true })
}
