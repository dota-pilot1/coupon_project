import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('./sqlite.db')
const db = drizzle(sqlite, { schema })
const now = new Date().toISOString()

db.insert(schema.boardCategory).values([
  { code: 'COMMON',        name: '공통',        sortOrder: 1, useYn: 'Y', createdAt: now, updatedAt: now },
  { code: 'COUPON',        name: '쿠폰',        sortOrder: 2, useYn: 'Y', createdAt: now, updatedAt: now },
  { code: 'SHOP',          name: '매장',        sortOrder: 3, useYn: 'Y', createdAt: now, updatedAt: now },
  { code: 'BRAND',         name: '브랜드',      sortOrder: 4, useYn: 'Y', createdAt: now, updatedAt: now },
  { code: 'COUPON_MASTER', name: '쿠폰 마스터', sortOrder: 5, useYn: 'Y', createdAt: now, updatedAt: now },
  { code: 'APPROVAL',      name: '승인 관리',   sortOrder: 6, useYn: 'Y', createdAt: now, updatedAt: now },
  { code: 'ISSUANCE',      name: '쿠폰 발급',   sortOrder: 7, useYn: 'Y', createdAt: now, updatedAt: now },
  { code: 'USAGE',         name: '사용 현황',   sortOrder: 8, useYn: 'Y', createdAt: now, updatedAt: now },
]).run()

console.log('카테고리 시드 완료')
sqlite.close()
