import { NextResponse } from 'next/server'
import { db } from '@/db'
import { issueImage } from '@/db/schema'
import { eq, asc } from 'drizzle-orm'

export async function GET(_req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const images = db
    .select()
    .from(issueImage)
    .where(eq(issueImage.issueId, Number(issueId)))
    .orderBy(asc(issueImage.createdAt))
    .all()
  return NextResponse.json(images)
}

export async function POST(req: Request, { params }: { params: Promise<{ issueId: string }> }) {
  const { issueId } = await params
  const body = await req.json()
  const { url, filename } = body

  if (!url || !filename) {
    return NextResponse.json({ error: 'url과 filename이 필요합니다.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const result = db
    .insert(issueImage)
    .values({ issueId: Number(issueId), url, filename, createdAt: now })
    .run()

  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}
