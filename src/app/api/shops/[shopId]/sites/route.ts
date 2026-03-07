import { NextResponse } from 'next/server'
import { db } from '@/db'
import { sites } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shopId: string }> }
) {
  const { shopId } = await params
  const data = db.select().from(sites).where(eq(sites.shopId, shopId)).all()
  return NextResponse.json(data)
}
