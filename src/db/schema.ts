import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

// ========================================
// 마스터 데이터 (점포/사이트/코너/메뉴)
// ========================================

export const shops = sqliteTable('shops', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
})

export const sites = sqliteTable('sites', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shopId: text('shop_id').notNull().references(() => shops.id),
})

export const corners = sqliteTable('corners', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shopId: text('shop_id').notNull().references(() => shops.id),
  siteId: text('site_id').notNull().references(() => sites.id),
})

export const menus = sqliteTable('menus', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  shopId: text('shop_id').notNull().references(() => shops.id),
  siteId: text('site_id').notNull().references(() => sites.id),
  cornerId: text('corner_id').notNull().references(() => corners.id),
  price: integer('price').notNull().default(0),
})

// ========================================
// 쿠폰 마스터
// ========================================

export const couponMaster = sqliteTable('coupon_master', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  discountType: text('discount_type').notNull().default('RATE'), // RATE | AMOUNT
  discountValue: integer('discount_value').notNull().default(0),
  startDate: text('start_date'),
  endDate: text('end_date'),
  termTypeCd: text('term_type_cd').notNull().default('00'), // 00=일자, 10=시간대, 01=요일, 11=시간대+요일
  apprvCd: text('apprv_cd').notNull().default('C'), // C=생성, W=승인요청, Y=승인, R=반려, T=강제중지
  apprvDt: text('apprv_dt'),
  useYn: text('use_yn').notNull().default('Y'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ========================================
// 쿠폰 사용제한 조건 (계층 FK 구조)
// 점포 → 사이트 → 코너 → 메뉴
// ========================================

export const condShop = sqliteTable('cond_shop', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  couponId: text('coupon_id').notNull().references(() => couponMaster.id, { onDelete: 'cascade' }),
  shopId: text('shop_id').notNull().references(() => shops.id),
})

export const condSite = sqliteTable('cond_site', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  couponId: text('coupon_id').notNull().references(() => couponMaster.id, { onDelete: 'cascade' }),
  condShopId: text('cond_shop_id').notNull().references(() => shops.id),
  siteId: text('site_id').notNull().references(() => sites.id),
})

export const condCorner = sqliteTable('cond_corner', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  couponId: text('coupon_id').notNull().references(() => couponMaster.id, { onDelete: 'cascade' }),
  condShopId: text('cond_shop_id').notNull().references(() => shops.id),
  condSiteId: text('cond_site_id').notNull().references(() => sites.id),
  cornerId: text('corner_id').notNull().references(() => corners.id),
})

export const condMenu = sqliteTable('cond_menu', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  couponId: text('coupon_id').notNull().references(() => couponMaster.id, { onDelete: 'cascade' }),
  condShopId: text('cond_shop_id').notNull().references(() => shops.id),
  condSiteId: text('cond_site_id').notNull().references(() => sites.id),
  condCornerId: text('cond_corner_id').notNull().references(() => corners.id),
  menuId: text('menu_id').notNull().references(() => menus.id),
})

// ========================================
// 유효 기간 제어 (시간대/요일 조건)
// TIME_COND_CD: '1' = 시간대, '2' = 요일
// ========================================

export const condTime = sqliteTable('cond_time', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  couponId: text('coupon_id').notNull().references(() => couponMaster.id, { onDelete: 'cascade' }),
  timeCondCd: text('time_cond_cd').notNull(), // '1'=시간대, '2'=요일
  timeCondSeq: integer('time_cond_seq').notNull().default(0),
  startTm: text('start_tm'), // HH:MM (시간대용)
  endTm: text('end_tm'),     // HH:MM (시간대용)
  dayOfWeek: text('day_of_week'), // '1111100' 비트맵 (요일용)
})

// ========================================
// 쿠폰 발급
// ========================================

export const couponIssuance = sqliteTable('coupon_issuance', {
  id: text('id').primaryKey(),
  couponId: text('coupon_id').notNull().references(() => couponMaster.id),
  issueQty: integer('issue_qty').notNull(),
  issueDt: text('issue_dt').notNull(),
  memo: text('memo'),
  createdAt: text('created_at').notNull(),
})

export const couponIssued = sqliteTable('coupon_issued', {
  id: text('id').primaryKey(),
  issuanceId: text('issuance_id').notNull().references(() => couponIssuance.id, { onDelete: 'cascade' }),
  couponId: text('coupon_id').notNull().references(() => couponMaster.id),
  status: text('status').notNull().default('UNUSED'), // UNUSED | USED | EXPIRED
  usedAt: text('used_at'),
  usedShopId: text('used_shop_id'),
  usedAmount: integer('used_amount'),
})

// ========================================
// 공통코드
// ========================================

export const codeGroup = sqliteTable('code_group', {
  groupCd: text('group_cd').primaryKey(),
  groupNm: text('group_nm').notNull(),
  description: text('description'),
  useYn: text('use_yn').notNull().default('Y'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const codeDetail = sqliteTable('code_detail', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  groupCd: text('group_cd').notNull().references(() => codeGroup.groupCd, { onDelete: 'cascade' }),
  detailCd: text('detail_cd').notNull(),
  detailNm: text('detail_nm').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  useYn: text('use_yn').notNull().default('Y'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
