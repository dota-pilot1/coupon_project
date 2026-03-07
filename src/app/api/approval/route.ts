import { NextResponse } from 'next/server'
import { db } from '@/db'
import { couponMaster } from '@/db/schema'

// 승인 관리 목록 조회 (전체 쿠폰 + 승인상태)
export async function GET() {
  const list = db
    .select({
      id: couponMaster.id,
      name: couponMaster.name,
      discountType: couponMaster.discountType,
      discountValue: couponMaster.discountValue,
      apprvCd: couponMaster.apprvCd,
      apprvDt: couponMaster.apprvDt,
      useYn: couponMaster.useYn,
      createdAt: couponMaster.createdAt,
    })
    .from(couponMaster)
    .all()

  return NextResponse.json(list)
}
