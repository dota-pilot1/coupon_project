import { NextResponse } from 'next/server'
import { db } from '@/db'
import { shops } from '@/db/schema'

export async function GET() {
  const data = db.select().from(shops).all()
  return NextResponse.json(data)
}
