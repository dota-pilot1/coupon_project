import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/db'
import { figmaPage } from '@/db/schema'
import { desc } from 'drizzle-orm'

export async function GET() {
  const pages = await db.select().from(figmaPage).orderBy(desc(figmaPage.createdAt))
  return NextResponse.json(pages)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const now = new Date().toISOString()
  const [created] = await db.insert(figmaPage).values({
    category: body.category || 'COMMON',
    title: body.title,
    description: body.description || null,
    author: body.author || 'admin',
    createdAt: now,
    updatedAt: now,
  }).returning()
  return NextResponse.json(created, { status: 201 })
}
