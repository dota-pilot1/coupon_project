import { NextResponse } from 'next/server'
import { db } from '@/db'
import { codeDetail } from '@/db/schema'
import { eq } from 'drizzle-orm'

// 상세코드 목록 조회
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ groupCd: string }> }
) {
  const { groupCd } = await params
  const details = db
    .select()
    .from(codeDetail)
    .where(eq(codeDetail.groupCd, groupCd))
    .all()
  return NextResponse.json(details)
}

// 상세코드 일괄 저장 (delete-all + re-insert)
export async function POST(
  req: Request,
  { params }: { params: Promise<{ groupCd: string }> }
) {
  const { groupCd } = await params
  const { details } = await req.json()
  const now = new Date().toISOString()

  const sqlite = (db as unknown as { _client: { transaction: (fn: () => void) => void } })
  // Use raw transaction via drizzle
  db.delete(codeDetail).where(eq(codeDetail.groupCd, groupCd)).run()

  for (const d of details) {
    db.insert(codeDetail)
      .values({
        groupCd,
        detailCd: d.detailCd,
        detailNm: d.detailNm,
        sortOrder: d.sortOrder ?? 0,
        useYn: d.useYn ?? 'Y',
        createdAt: now,
        updatedAt: now,
      })
      .run()
  }

  return NextResponse.json({ ok: true, count: details.length })
}
