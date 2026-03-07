import { NextResponse } from 'next/server'
import { db } from '@/db'
import {
  couponMaster,
  condShop,
  condSite,
  condCorner,
  condMenu,
  shops,
  sites,
  corners,
  menus,
} from '@/db/schema'
import { eq } from 'drizzle-orm'

// 쿠폰 상세 조회 (마스터 + 사용제한 조건)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ couponId: string }> }
) {
  const { couponId } = await params

  const master = db
    .select()
    .from(couponMaster)
    .where(eq(couponMaster.id, couponId))
    .get()

  if (!master) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // 점포별로 그룹핑된 조건 데이터 조회
  const condShops = db
    .select({ shopId: condShop.shopId, shopName: shops.name })
    .from(condShop)
    .innerJoin(shops, eq(condShop.shopId, shops.id))
    .where(eq(condShop.couponId, couponId))
    .all()

  const conditions = condShops.map((cs) => {
    const siteList = db
      .select({ id: condSite.siteId, name: sites.name })
      .from(condSite)
      .innerJoin(sites, eq(condSite.siteId, sites.id))
      .where(eq(condSite.couponId, couponId))
      .all()
      .filter((s) => {
        const row = db
          .select()
          .from(condSite)
          .where(eq(condSite.couponId, couponId))
          .all()
          .find((r) => r.siteId === s.id && r.condShopId === cs.shopId)
        return !!row
      })

    const cornerList = db
      .select({
        id: condCorner.cornerId,
        name: corners.name,
        siteId: condCorner.condSiteId,
      })
      .from(condCorner)
      .innerJoin(corners, eq(condCorner.cornerId, corners.id))
      .where(eq(condCorner.couponId, couponId))
      .all()
      .filter((c) => {
        const row = db
          .select()
          .from(condCorner)
          .where(eq(condCorner.couponId, couponId))
          .all()
          .find((r) => r.cornerId === c.id && r.condShopId === cs.shopId)
        return !!row
      })

    const menuList = db
      .select({
        id: condMenu.menuId,
        name: menus.name,
        siteId: condMenu.condSiteId,
        cornerId: condMenu.condCornerId,
      })
      .from(condMenu)
      .innerJoin(menus, eq(condMenu.menuId, menus.id))
      .where(eq(condMenu.couponId, couponId))
      .all()
      .filter((m) => {
        const row = db
          .select()
          .from(condMenu)
          .where(eq(condMenu.couponId, couponId))
          .all()
          .find((r) => r.menuId === m.id && r.condShopId === cs.shopId)
        return !!row
      })

    return {
      shopId: cs.shopId,
      shopName: cs.shopName,
      sites: siteList,
      corners: cornerList,
      menus: menuList,
    }
  })

  return NextResponse.json({ ...master, conditions })
}
