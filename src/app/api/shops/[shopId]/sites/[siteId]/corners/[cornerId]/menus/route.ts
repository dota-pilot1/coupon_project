import { NextResponse } from 'next/server'
import { db } from '@/db'
import { menus } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shopId: string; siteId: string; cornerId: string }> }
) {
  const { shopId, siteId, cornerId } = await params
  const data = db
    .select()
    .from(menus)
    .where(
      and(
        eq(menus.shopId, shopId),
        eq(menus.siteId, siteId),
        eq(menus.cornerId, cornerId)
      )
    )
    .all()
  return NextResponse.json(data)
}
