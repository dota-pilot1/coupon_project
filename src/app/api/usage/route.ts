import { NextResponse } from 'next/server'
import { db } from '@/db'
import { couponIssued, couponMaster, couponIssuance } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'

export async function GET() {
  // 전체 통계
  const allIssued = db.select().from(couponIssued).all()
  const totalIssued = allIssued.length
  const usedCount = allIssued.filter((c) => c.status === 'USED').length
  const unusedCount = allIssued.filter((c) => c.status === 'UNUSED').length
  const expiredCount = allIssued.filter((c) => c.status === 'EXPIRED').length
  const usageRate = totalIssued > 0 ? Math.round((usedCount / totalIssued) * 100) : 0

  // 쿠폰별 집계
  const couponStats = db
    .select({
      couponId: couponIssued.couponId,
      couponName: couponMaster.name,
      total: sql<number>`count(*)`,
      used: sql<number>`sum(case when ${couponIssued.status} = 'USED' then 1 else 0 end)`,
      unused: sql<number>`sum(case when ${couponIssued.status} = 'UNUSED' then 1 else 0 end)`,
      expired: sql<number>`sum(case when ${couponIssued.status} = 'EXPIRED' then 1 else 0 end)`,
    })
    .from(couponIssued)
    .innerJoin(couponMaster, eq(couponIssued.couponId, couponMaster.id))
    .groupBy(couponIssued.couponId)
    .all()

  // 상세 목록 (최근 발급분)
  const details = db
    .select({
      id: couponIssued.id,
      couponId: couponIssued.couponId,
      couponName: couponMaster.name,
      issuanceId: couponIssued.issuanceId,
      status: couponIssued.status,
      usedAt: couponIssued.usedAt,
      usedShopId: couponIssued.usedShopId,
      usedAmount: couponIssued.usedAmount,
    })
    .from(couponIssued)
    .innerJoin(couponMaster, eq(couponIssued.couponId, couponMaster.id))
    .all()

  return NextResponse.json({
    stats: { totalIssued, usedCount, unusedCount, expiredCount, usageRate },
    couponStats,
    details,
  })
}
