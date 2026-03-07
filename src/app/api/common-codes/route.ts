import { NextResponse } from 'next/server'
import { db } from '@/db'
import { codeGroup, codeDetail } from '@/db/schema'
import { eq } from 'drizzle-orm'

// 그룹코드 목록 조회
export async function GET() {
  const groups = db.select().from(codeGroup).all()
  return NextResponse.json(groups)
}

// 그룹코드 저장 (신규/수정)
export async function POST(req: Request) {
  const body = await req.json()
  const now = new Date().toISOString()

  const existing = db
    .select()
    .from(codeGroup)
    .where(eq(codeGroup.groupCd, body.groupCd))
    .get()

  if (existing) {
    db.update(codeGroup)
      .set({
        groupNm: body.groupNm,
        description: body.description || null,
        useYn: body.useYn || 'Y',
        updatedAt: now,
      })
      .where(eq(codeGroup.groupCd, body.groupCd))
      .run()
  } else {
    db.insert(codeGroup)
      .values({
        groupCd: body.groupCd,
        groupNm: body.groupNm,
        description: body.description || null,
        useYn: body.useYn || 'Y',
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }

  return NextResponse.json({ ok: true })
}

// 그룹코드 삭제
export async function DELETE(req: Request) {
  const { groupCd } = await req.json()
  db.delete(codeDetail).where(eq(codeDetail.groupCd, groupCd)).run()
  db.delete(codeGroup).where(eq(codeGroup.groupCd, groupCd)).run()
  return NextResponse.json({ ok: true })
}
