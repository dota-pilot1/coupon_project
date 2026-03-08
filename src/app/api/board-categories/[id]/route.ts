import { NextResponse } from 'next/server'
import { db } from '@/db'
import { boardCategory } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, sortOrder, useYn } = body

  if (!name?.trim()) return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })

  const now = new Date().toISOString()
  db.update(boardCategory)
    .set({ name: name.trim(), sortOrder: sortOrder ?? 0, useYn: useYn ?? 'Y', updatedAt: now })
    .where(eq(boardCategory.id, Number(id)))
    .run()

  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  db.delete(boardCategory).where(eq(boardCategory.id, Number(id))).run()
  return NextResponse.json({ ok: true })
}
