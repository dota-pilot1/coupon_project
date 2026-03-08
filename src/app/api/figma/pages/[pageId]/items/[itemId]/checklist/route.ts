import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaChecklist } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string; itemId: string }> }
) {
  const { itemId } = await params
  const items = await db.select().from(figmaChecklist).where(eq(figmaChecklist.itemId, parseInt(itemId)))
  return NextResponse.json(items)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string; itemId: string }> }
) {
  const { itemId } = await params
  const body = await req.json()
  const [created] = await db.insert(figmaChecklist).values({
    itemId: parseInt(itemId),
    content: body.content,
    checked: 0,
    createdAt: new Date().toISOString(),
  }).returning()
  return NextResponse.json(created, { status: 201 })
}
