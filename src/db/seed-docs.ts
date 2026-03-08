import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import * as schema from './schema'

const sqlite = new Database('./sqlite.db')
sqlite.pragma('foreign_keys = ON')
const db = drizzle(sqlite, { schema })

const now = new Date().toISOString()

// 폴더 삽입 (최소한의 초기 구조만)
const [folder1] = db
  .insert(schema.docFolder)
  .values({ name: '개발 환경', parentId: null, sortOrder: 0, createdAt: now, updatedAt: now })
  .returning()
  .all()

const [folder2] = db
  .insert(schema.docFolder)
  .values({ name: '쿠폰 프로세스', parentId: null, sortOrder: 1, createdAt: now, updatedAt: now })
  .returning()
  .all()

console.log('폴더 생성:', folder1.id, folder2.id)

console.log('문서 관리 seed 완료')
sqlite.close()

db.insert(schema.docPost)
  .values({
    folderId: folder1.id,
    title: '환경 설정 가이드',
    content: `# 개발 환경 설정 가이드

## 프로젝트 개요
- Next.js + TypeScript
- DB: SQLite (better-sqlite3) — 별도 DB 서버 불필요
- ORM: Drizzle ORM
- .env 파일 불필요

## 실행 방법
\`\`\`bash
npm install
npx drizzle-kit push
npx tsx src/db/seed.ts
npm run dev
\`\`\`

## 주요 패키지
- next 15
- drizzle-orm + better-sqlite3
- @tanstack/react-query
- tabulator-tables
- tailwindcss
- sonner (toast)`,
    contentType: 'MD',
    author: 'admin',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  })
  .run()

// 쿠폰 프로세스 분석 문서들
db.insert(schema.docPost)
  .values({
    folderId: folder2.id,
    title: '프로세스 개요',
    content: `# 쿠폰 관리 전체 프로세스 개요

## 프로세스 흐름 (4단계)

**저장(생성) → 승인 → 발급 → 사용**

### 1) 저장(생성)
담당자가 쿠폰 마스터 등록
- 쿠폰명, 할인유형(정률/정액), 할인값
- 사용 대상 제한 (점포 → 사이트 → 코너 → 메뉴)
- 유효 기간 제어 (일자/시간대/요일)
- 저장 시 승인상태 = C(생성)

### 2) 승인
상위 결재자가 검토 후 상태 변경
- C(생성) → W(승인요청) → Y(승인) or R(반려)
- Y(승인) → T(강제중지) 가능
- Maker-Checker 패턴 (등록자 ≠ 승인자)

### 3) 발급
쿠폰 마스터 기반으로 실제 쿠폰 생성·배포
- 발급 유형: 선착순(FIRST_COME), 타겟(TARGET), 자동(AUTO)

### 4) 사용
발급된 쿠폰을 POS에서 적용`,
    contentType: 'MD',
    author: 'admin',
    sortOrder: 0,
    createdAt: now,
    updatedAt: now,
  })
  .run()

db.insert(schema.docPost)
  .values({
    folderId: folder2.id,
    title: '전체 프로세스 플로우',
    content: `flowchart LR
    subgraph STEP1["1단계: 등록"]
        A1[쿠폰 마스터 등록] --> A2[할인유형/값 설정]
        A2 --> A3[사용 대상 설정]
        A3 --> A4[유효기간 설정]
    end

    subgraph STEP2["2단계: 승인"]
        B1[승인 요청] --> B2{검토}
        B2 -->|승인| B3[Y 상태]
        B2 -->|반려| B4[R 상태]
        B4 --> B1
    end

    subgraph STEP3["3단계: 발급"]
        C1[발급 생성] --> C2[쿠폰 배포]
    end

    subgraph STEP4["4단계: 사용"]
        D1[쿠폰 제시] --> D2[POS 적용]
        D2 --> D3[할인 적용]
    end

    STEP1 --> STEP2 --> STEP3 --> STEP4`,
    contentType: 'MMD',
    author: 'admin',
    sortOrder: 1,
    createdAt: now,
    updatedAt: now,
  })
  .run()

db.insert(schema.docPost)
  .values({
    folderId: folder2.id,
    title: '승인 관리 시퀀스',
    content: `sequenceDiagram
    participant U as 담당자
    participant S as 시스템
    participant A as 승인자

    U->>S: 쿠폰 등록 (상태: C)
    U->>S: 승인 요청 (C→W)
    S->>A: 승인 요청 알림
    A->>S: 검토
    alt 승인
        A->>S: 승인 처리 (W→Y)
        S->>U: 승인 완료 알림
    else 반려
        A->>S: 반려 처리 (W→R)
        S->>U: 반려 사유 전달
        U->>S: 재요청 (R→W)
    end`,
    contentType: 'MMD',
    author: 'admin',
    sortOrder: 2,
    createdAt: now,
    updatedAt: now,
  })
  .run()

db.insert(schema.docPost)
  .values({
    folderId: folder2.id,
    title: 'DB ERD',
    content: `erDiagram
    coupon_master ||--o{ cond_shop : has
    coupon_master ||--o{ cond_site : has
    coupon_master ||--o{ cond_corner : has
    coupon_master ||--o{ cond_menu : has
    coupon_master ||--o{ cond_time : has
    coupon_master ||--o{ coupon_issuance : issued_by
    coupon_issuance ||--o{ coupon_issued : generates

    shops ||--o{ sites : contains
    shops ||--o{ corners : contains
    sites ||--o{ corners : contains
    corners ||--o{ menus : contains`,
    contentType: 'MMD',
    author: 'admin',
    sortOrder: 3,
    createdAt: now,
    updatedAt: now,
  })
  .run()

console.log('문서 관리 seed 완료')
sqlite.close()
