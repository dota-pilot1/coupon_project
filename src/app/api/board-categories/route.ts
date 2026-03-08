import { NextResponse } from 'next/server'
import { db } from '@/db'
import { boardCategory } from '@/db/schema'
import { asc, eq } from 'drizzle-orm'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const all = searchParams.get('all')

  let query = db.select().from(boardCategory).orderBy(asc(boardCategory.sortOrder)).$dynamic()
  if (!all) query = query.where(eq(boardCategory.useYn, 'Y'))

  const list = query.all()
  return NextResponse.json(list)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { code, name, sortOrder } = body

  if (!code?.trim()) return NextResponse.json({ error: '코드를 입력하세요.' }, { status: 400 })
  if (!name?.trim()) return NextResponse.json({ error: '이름을 입력하세요.' }, { status: 400 })

  const now = new Date().toISOString()
  const result = db
    .insert(boardCategory)
    .values({ code: code.trim().toUpperCase(), name: name.trim(), sortOrder: sortOrder ?? 0, useYn: 'Y', createdAt: now, updatedAt: now })
    .run()

  return NextResponse.json({ ok: true, id: result.lastInsertRowid })
}
