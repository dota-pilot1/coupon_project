import { NextResponse } from 'next/server'
import { db } from '@/db'
import { corners } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shopId: string; siteId: string }> }
) {
  const { shopId, siteId } = await params
  const data = db
    .select()
    .from(corners)
    .where(and(eq(corners.shopId, shopId), eq(corners.siteId, siteId)))
    .all()
  return NextResponse.json(data)
}
