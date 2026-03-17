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
  issueTitle: text('issue_title'), // 발행제목 (이벤트 구분용)
  issueType: text('issue_type').notNull().default('FIRST_COME'), // FIRST_COME=선착순, TARGET=타겟, AUTO=자동
  issueQty: integer('issue_qty').notNull(),
  validStartDate: text('valid_start_date'), // 발행 건별 유효기간 시작
  validEndDate: text('valid_end_date'),     // 발행 건별 유효기간 종료
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

// ========================================
// 코드 리뷰 게시판
// ========================================

export const reviewPost = sqliteTable('review_post', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull().default('COMMON'), // COUPON_MASTER | APPROVAL | ISSUANCE | USAGE | COMMON
  title: text('title').notNull(),
  content: text('content').notNull(),
  author: text('author').notNull().default('admin'),
  mmdContent: text('mmd_content'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const reviewComment = sqliteTable('review_comment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => reviewPost.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  author: text('author').notNull().default('admin'),
  createdAt: text('created_at').notNull(),
})

export const reviewStep = sqliteTable('review_step', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => reviewPost.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  title: text('title'),
  content: text('content').notNull().default(''),
})

// ========================================
// 게시판 카테고리 (이슈/코드리뷰 공용)
// ========================================

export const boardCategory = sqliteTable('board_category', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  code: text('code').notNull().unique(),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  useYn: text('use_yn').notNull().default('Y'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ========================================
// 이슈 관리
// ========================================

export const issuePost = sqliteTable('issue_post', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull().default('COMMON'), // COUPON_MASTER | APPROVAL | ISSUANCE | USAGE | COMMON
  title: text('title').notNull(),
  content: text('content').notNull(),
  status: text('status').notNull().default('OPEN'), // OPEN | IN_PROGRESS | RESOLVED | CLOSED
  priority: text('priority').notNull().default('MEDIUM'), // LOW | MEDIUM | HIGH | CRITICAL
  author: text('author').notNull().default('admin'),
  mmdContent: text('mmd_content'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const issueChecklist = sqliteTable('issue_checklist', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  issueId: integer('issue_id').notNull().references(() => issuePost.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  checked: integer('checked').notNull().default(0), // 0=미완료, 1=완료
  imageUrl: text('image_url'),
  imageFilename: text('image_filename'),
  createdAt: text('created_at').notNull(),
})

export const issueComment = sqliteTable('issue_comment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  issueId: integer('issue_id').notNull().references(() => issuePost.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  author: text('author').notNull().default('admin'),
  createdAt: text('created_at').notNull(),
})

export const issueImage = sqliteTable('issue_image', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  issueId: integer('issue_id').notNull().references(() => issuePost.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  filename: text('filename').notNull(),
  createdAt: text('created_at').notNull(),
})

// ========================================
// 피그마 관리
// ========================================

export const figmaPage = sqliteTable('figma_page', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull().default('COMMON'),
  title: text('title').notNull(),
  description: text('description'),
  author: text('author').notNull().default('admin'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const figmaItem = sqliteTable('figma_item', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  pageId: integer('page_id').notNull().references(() => figmaPage.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  figmaUrl: text('figma_url').notNull(),
  version: text('version'),
  author: text('author').notNull().default('admin'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const figmaChecklist = sqliteTable('figma_checklist', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  itemId: integer('item_id').notNull().references(() => figmaItem.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  checked: integer('checked').notNull().default(0),
  createdAt: text('created_at').notNull(),
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

// ========================================
// 프론트엔드 (컴포넌트 제작 공유)
// ========================================

export const frontendPost = sqliteTable('frontend_post', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  category: text('category').notNull().default('COMMON'),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  author: text('author').notNull().default('admin'),
  mmdContent: text('mmd_content'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const frontendComment = sqliteTable('frontend_comment', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => frontendPost.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  author: text('author').notNull().default('admin'),
  createdAt: text('created_at').notNull(),
})

export const frontendStep = sqliteTable('frontend_step', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => frontendPost.id, { onDelete: 'cascade' }),
  stepOrder: integer('step_order').notNull(),
  title: text('title'),
  content: text('content').notNull().default(''),
})

// ========================================
// 문서 관리
// ========================================

export const docFolder = sqliteTable('doc_folder', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  parentId: integer('parent_id'), // null = 최상위 폴더
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const docPost = sqliteTable('doc_post', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  folderId: integer('folder_id').notNull().references(() => docFolder.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''), // 하위 호환성 유지용 (이후 블록으로 분리됨)
  contentType: text('content_type').notNull().default('NOTE'), // NOTE | MMD | FIGMA | FILE
  author: text('author').notNull().default('admin'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const docBlock = sqliteTable('doc_block', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => docPost.id, { onDelete: 'cascade' }),
  blockType: text('block_type').notNull().default('NOTE'), // NOTE | MMD | FIGMA | FILE
  content: text('content').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

// ========================================
// Task 관리 (팀원별)
// ========================================

export const taskFolder = sqliteTable('task_folder', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(), // 팀원 이름
  parentId: integer('parent_id'), // null = 최상위 폴더
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const taskPost = sqliteTable('task_post', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  folderId: integer('folder_id').notNull().references(() => taskFolder.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  content: text('content').notNull().default(''),
  contentType: text('content_type').notNull().default('NOTE'),
  author: text('author').notNull().default('admin'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})

export const taskBlock = sqliteTable('task_block', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  postId: integer('post_id').notNull().references(() => taskPost.id, { onDelete: 'cascade' }),
  blockType: text('block_type').notNull().default('NOTE'),
  content: text('content').notNull().default(''),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
})
