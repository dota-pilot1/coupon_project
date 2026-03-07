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

  // 공통코드 그룹
  const now = new Date().toISOString()
  db.insert(schema.codeGroup).values([
    { groupCd: 'DC_TYPE', groupNm: '할인유형', description: '쿠폰 할인 유형 코드', useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'CPN_STS', groupNm: '쿠폰상태', description: '발급 쿠폰 상태 코드', useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'APPRV_CD', groupNm: '승인상태', description: '쿠폰 승인 상태 코드', useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'TERM_TYPE', groupNm: '기간제어유형', description: '유효기간 제어 방식', useYn: 'Y', createdAt: now, updatedAt: now },
  ]).run()

  // 공통코드 상세
  db.insert(schema.codeDetail).values([
    // 할인유형
    { groupCd: 'DC_TYPE', detailCd: 'RATE', detailNm: '정률(%)', sortOrder: 1, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'DC_TYPE', detailCd: 'AMOUNT', detailNm: '정액(원)', sortOrder: 2, useYn: 'Y', createdAt: now, updatedAt: now },
    // 쿠폰상태
    { groupCd: 'CPN_STS', detailCd: 'UNUSED', detailNm: '미사용', sortOrder: 1, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'CPN_STS', detailCd: 'USED', detailNm: '사용완료', sortOrder: 2, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'CPN_STS', detailCd: 'EXPIRED', detailNm: '만료', sortOrder: 3, useYn: 'Y', createdAt: now, updatedAt: now },
    // 승인상태
    { groupCd: 'APPRV_CD', detailCd: 'C', detailNm: '생성', sortOrder: 1, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'APPRV_CD', detailCd: 'W', detailNm: '승인요청', sortOrder: 2, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'APPRV_CD', detailCd: 'Y', detailNm: '승인', sortOrder: 3, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'APPRV_CD', detailCd: 'R', detailNm: '반려', sortOrder: 4, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'APPRV_CD', detailCd: 'T', detailNm: '강제중지', sortOrder: 5, useYn: 'Y', createdAt: now, updatedAt: now },
    // 기간제어유형
    { groupCd: 'TERM_TYPE', detailCd: '00', detailNm: '일자제어', sortOrder: 1, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'TERM_TYPE', detailCd: '10', detailNm: '시간대제어', sortOrder: 2, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'TERM_TYPE', detailCd: '01', detailNm: '요일제어', sortOrder: 3, useYn: 'Y', createdAt: now, updatedAt: now },
    { groupCd: 'TERM_TYPE', detailCd: '11', detailNm: '시간대+요일제어', sortOrder: 4, useYn: 'Y', createdAt: now, updatedAt: now },
  ]).run()

  console.log('Seed completed!')
}

seed()
sqlite.close()
