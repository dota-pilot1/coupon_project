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
