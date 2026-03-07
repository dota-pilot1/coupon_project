import { NextResponse } from 'next/server'
import { db } from '@/db'
import { couponMaster, condShop, condSite, condCorner, condMenu } from '@/db/schema'
import { eq } from 'drizzle-orm'

// 쿠폰 목록 조회
export async function GET() {
  const data = db.select().from(couponMaster).all()
  return NextResponse.json(data)
}

// 쿠폰 저장 (마스터 + 사용제한 조건)
export async function POST(req: Request) {
  const body = await req.json()
  const now = new Date().toISOString()
  const couponId = body.id || `CPN${Date.now()}`

  // 트랜잭션으로 마스터 + 조건 일괄 저장
  const result = db.transaction((tx) => {
    // 1. 쿠폰 마스터 upsert
    const existing = tx
      .select()
      .from(couponMaster)
      .where(eq(couponMaster.id, couponId))
      .get()

    if (existing) {
      tx.update(couponMaster)
        .set({
          name: body.name,
          description: body.description,
          discountType: body.discountType,
          discountValue: body.discountValue,
          startDate: body.startDate,
          endDate: body.endDate,
          useYn: body.useYn ?? 'Y',
          updatedAt: now,
        })
        .where(eq(couponMaster.id, couponId))
        .run()
    } else {
      tx.insert(couponMaster)
        .values({
          id: couponId,
          name: body.name,
          description: body.description,
          discountType: body.discountType ?? 'RATE',
          discountValue: body.discountValue ?? 0,
          startDate: body.startDate,
          endDate: body.endDate,
          useYn: body.useYn ?? 'Y',
          createdAt: now,
          updatedAt: now,
        })
        .run()
    }

    // 2. 기존 조건 삭제 (cascade 대신 명시적 삭제)
    tx.delete(condMenu).where(eq(condMenu.couponId, couponId)).run()
    tx.delete(condCorner).where(eq(condCorner.couponId, couponId)).run()
    tx.delete(condSite).where(eq(condSite.couponId, couponId)).run()
    tx.delete(condShop).where(eq(condShop.couponId, couponId)).run()

    // 3. 조건 재등록 (탭별 = 점포별 데이터)
    const insertLog: Array<{ table: string; data: Record<string, string> }> = []

    if (body.conditions) {
      for (const cond of body.conditions) {
        // 점포
        const shopRow = { couponId, shopId: cond.shopId }
        tx.insert(condShop).values(shopRow).run()
        insertLog.push({ table: 'COND_SHOP', data: shopRow })

        // 사이트
        for (const site of cond.sites || []) {
          const siteRow = { couponId, condShopId: cond.shopId, siteId: site.id }
          tx.insert(condSite).values(siteRow).run()
          insertLog.push({ table: 'COND_SITE', data: siteRow })
        }

        // 코너
        for (const corner of cond.corners || []) {
          const cornerRow = {
            couponId,
            condShopId: cond.shopId,
            condSiteId: corner.siteId,
            cornerId: corner.id,
          }
          tx.insert(condCorner).values(cornerRow).run()
          insertLog.push({ table: 'COND_CORNER', data: cornerRow })
        }

        // 메뉴
        for (const menu of cond.menus || []) {
          const menuRow = {
            couponId,
            condShopId: cond.shopId,
            condSiteId: menu.siteId,
            condCornerId: menu.cornerId,
            menuId: menu.id,
          }
          tx.insert(condMenu).values(menuRow).run()
          insertLog.push({ table: 'COND_MENU', data: menuRow })
        }
      }
    }

    return { id: couponId, insertLog }
  })

  return NextResponse.json(result)
}
