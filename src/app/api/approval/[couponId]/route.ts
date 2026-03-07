import { NextResponse } from 'next/server'
import { db } from '@/db'
import { couponMaster } from '@/db/schema'
import { eq } from 'drizzle-orm'

// 상태 전이 규칙: 현재상태 → 허용되는 다음 상태들
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  C: ['W'],        // 생성 → 승인요청
  W: ['Y', 'R'],   // 승인요청 → 승인 or 반려
  Y: ['T'],        // 승인 → 강제중지
  R: ['W'],        // 반려 → 재승인요청
  T: [],           // 강제중지 → (변경불가)
}

// 승인 상태 변경
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  const { couponId } = await params
  const { newStatus } = await req.json()

  const coupon = db
    .select()
    .from(couponMaster)
    .where(eq(couponMaster.id, couponId))
    .get()

  if (!coupon) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const allowed = ALLOWED_TRANSITIONS[coupon.apprvCd] || []
  if (!allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `'${coupon.apprvCd}' → '${newStatus}' 상태 전이는 불가합니다.` },
      { status: 400 }
    )
  }

  const now = new Date().toISOString()
  db.update(couponMaster)
    .set({
      apprvCd: newStatus,
      apprvDt: now,
      updatedAt: now,
    })
    .where(eq(couponMaster.id, couponId))
    .run()

  return NextResponse.json({ ok: true, apprvCd: newStatus, apprvDt: now })
}
