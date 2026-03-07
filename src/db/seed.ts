import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('./sqlite.db')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

function seed() {
  // 점포
  db.insert(schema.shops).values([
    { id: 'SHOP01', name: '인천공항T1점' },
    { id: 'SHOP02', name: '강남역점' },
    { id: 'SHOP03', name: '여의도점' },
  ]).run()

  // 사이트
  db.insert(schema.sites).values([
    { id: 'STE01', name: '1층 푸드코트', shopId: 'SHOP01' },
    { id: 'STE02', name: '2층 푸드코트', shopId: 'SHOP01' },
    { id: 'STE03', name: 'B1 푸드홀', shopId: 'SHOP02' },
    { id: 'STE04', name: '1층 매장', shopId: 'SHOP02' },
    { id: 'STE05', name: '지하 푸드코트', shopId: 'SHOP03' },
  ]).run()

  // 코너
  db.insert(schema.corners).values([
    { id: 'CRNR01', name: '한식코너', shopId: 'SHOP01', siteId: 'STE01' },
    { id: 'CRNR02', name: '양식코너', shopId: 'SHOP01', siteId: 'STE01' },
    { id: 'CRNR03', name: '일식코너', shopId: 'SHOP01', siteId: 'STE02' },
    { id: 'CRNR04', name: '중식코너', shopId: 'SHOP02', siteId: 'STE03' },
    { id: 'CRNR05', name: '분식코너', shopId: 'SHOP02', siteId: 'STE03' },
    { id: 'CRNR06', name: '카페코너', shopId: 'SHOP02', siteId: 'STE04' },
    { id: 'CRNR07', name: '한식코너', shopId: 'SHOP03', siteId: 'STE05' },
    { id: 'CRNR08', name: '양식코너', shopId: 'SHOP03', siteId: 'STE05' },
  ]).run()

  // 메뉴
  db.insert(schema.menus).values([
    { id: 'MENU01', name: '비빔밥', shopId: 'SHOP01', siteId: 'STE01', cornerId: 'CRNR01', price: 9000 },
    { id: 'MENU02', name: '김치찌개', shopId: 'SHOP01', siteId: 'STE01', cornerId: 'CRNR01', price: 8000 },
    { id: 'MENU03', name: '불고기정식', shopId: 'SHOP01', siteId: 'STE01', cornerId: 'CRNR01', price: 11000 },
    { id: 'MENU04', name: '파스타', shopId: 'SHOP01', siteId: 'STE01', cornerId: 'CRNR02', price: 12000 },
    { id: 'MENU05', name: '스테이크', shopId: 'SHOP01', siteId: 'STE01', cornerId: 'CRNR02', price: 18000 },
    { id: 'MENU06', name: '초밥세트', shopId: 'SHOP01', siteId: 'STE02', cornerId: 'CRNR03', price: 15000 },
    { id: 'MENU07', name: '라멘', shopId: 'SHOP01', siteId: 'STE02', cornerId: 'CRNR03', price: 10000 },
    { id: 'MENU08', name: '짜장면', shopId: 'SHOP02', siteId: 'STE03', cornerId: 'CRNR04', price: 7000 },
    { id: 'MENU09', name: '짬뽕', shopId: 'SHOP02', siteId: 'STE03', cornerId: 'CRNR04', price: 8000 },
    { id: 'MENU10', name: '떡볶이', shopId: 'SHOP02', siteId: 'STE03', cornerId: 'CRNR05', price: 5000 },
    { id: 'MENU11', name: '아메리카노', shopId: 'SHOP02', siteId: 'STE04', cornerId: 'CRNR06', price: 4500 },
    { id: 'MENU12', name: '카페라떼', shopId: 'SHOP02', siteId: 'STE04', cornerId: 'CRNR06', price: 5000 },
    { id: 'MENU13', name: '된장찌개', shopId: 'SHOP03', siteId: 'STE05', cornerId: 'CRNR07', price: 8500 },
    { id: 'MENU14', name: '제육볶음', shopId: 'SHOP03', siteId: 'STE05', cornerId: 'CRNR07', price: 9500 },
    { id: 'MENU15', name: '피자', shopId: 'SHOP03', siteId: 'STE05', cornerId: 'CRNR08', price: 14000 },
  ]).run()

  console.log('Seed completed!')
}

seed()
sqlite.close()
