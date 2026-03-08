import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaItem } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params
  const items = await db.select().from(figmaItem).where(eq(figmaItem.pageId, parseInt(pageId)))
  return NextResponse.json(items)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ pageId: string }> }
) {
  const { pageId } = await params
  const body = await req.json()
  const now = new Date().toISOString()
  const [created] = await db.insert(figmaItem).values({
    pageId: parseInt(pageId),
    title: body.title,
    figmaUrl: body.figmaUrl,
    version: body.version || null,
    author: body.author || 'admin',
    createdAt: now,
    updatedAt: now,
  }).returning()
  return NextResponse.json(created, { status: 201 })
}
