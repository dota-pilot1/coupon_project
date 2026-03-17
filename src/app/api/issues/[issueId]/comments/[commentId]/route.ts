import { NextResponse } from 'next/server'
import { db } from '@/db'
import { issueComment } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(_req: Request, { params }: { params: Promise<{ issueId: string; commentId: string }> }) {
  const { commentId } = await params
  const id = Number(commentId)

  db.delete(issueComment).where(eq(issueComment.id, id)).run()
  return NextResponse.json({ ok: true })
}
