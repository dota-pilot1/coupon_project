import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaPage, figmaItem, figmaChecklist } from '@/db/schema'
import { eq, inArray } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params
  const id = parseInt(pageId)

  const [page] = await db.select().from(figmaPage).where(eq(figmaPage.id, id))
  if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const items = await db.select().from(figmaItem).where(eq(figmaItem.pageId, id))
  const itemIds = items.map(i => i.id)
  const checklists = itemIds.length
    ? await db.select().from(figmaChecklist).where(inArray(figmaChecklist.itemId, itemIds))
    : []

  return NextResponse.json({
    ...page,
    items: items.map(item => ({
      ...item,
      checklist: checklists.filter(c => c.itemId === item.id),
    })),
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params
  const id = parseInt(pageId)
  const body = await req.json()
  const [updated] = await db
    .update(figmaPage)
    .set({
      category: body.category,
      title: body.title,
      description: body.description,
      author: body.author,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(figmaPage.id, id))
    .returning()
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params
  const id = parseInt(pageId)
  await db.delete(figmaPage).where(eq(figmaPage.id, id))
  return NextResponse.json({ success: true })
}
