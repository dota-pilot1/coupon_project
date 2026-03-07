import { NextResponse } from 'next/server'
import { db } from '@/db'
import { couponMaster, couponIssuance, couponIssued } from '@/db/schema'
import { eq } from 'drizzle-orm'

// 발급 이력 목록 조회
export async function GET() {
  const list = db
    .select({
      id: couponIssuance.id,
      couponId: couponIssuance.couponId,
      couponName: couponMaster.name,
      issueQty: couponIssuance.issueQty,
      issueDt: couponIssuance.issueDt,
      memo: couponIssuance.memo,
      createdAt: couponIssuance.createdAt,
    })
    .from(couponIssuance)
    .innerJoin(couponMaster, eq(couponIssuance.couponId, couponMaster.id))
    .all()

  return NextResponse.json(list)
}

// 쿠폰 발급 실행
export async function POST(req: Request) {
  const body = await req.json()
  const { couponId, issueQty, memo } = body

  // 쿠폰 존재 확인
  const coupon = db
    .select()
    .from(couponMaster)
    .where(eq(couponMaster.id, couponId))
    .get()

  if (!coupon) {
    return NextResponse.json({ error: '쿠폰이 존재하지 않습니다.' }, { status: 404 })
  }

  if (coupon.apprvCd !== 'Y') {
    return NextResponse.json({ error: '승인 완료된 쿠폰만 발급할 수 있습니다.' }, { status: 400 })
  }

  const now = new Date().toISOString()
  const issuanceId = `ISS-${Date.now()}`

  // 발급 마스터 INSERT
  db.insert(couponIssuance)
    .values({
      id: issuanceId,
      couponId,
      issueQty,
      issueDt: now.slice(0, 10),
      memo: memo || null,
      createdAt: now,
    })
    .run()

  // 개별 쿠폰 N건 INSERT
  const issuedCoupons: Array<{ id: string; status: string }> = []
  for (let i = 0; i < issueQty; i++) {
    const couponNo = `CPN-${Date.now()}-${String(i + 1).padStart(4, '0')}`
    db.insert(couponIssued)
      .values({
        id: couponNo,
        issuanceId,
        couponId,
        status: 'UNUSED',
      })
      .run()
    issuedCoupons.push({ id: couponNo, status: 'UNUSED' })
  }

  return NextResponse.json({
    ok: true,
    issuanceId,
    issuedCount: issueQty,
    coupons: issuedCoupons,
  })
}
