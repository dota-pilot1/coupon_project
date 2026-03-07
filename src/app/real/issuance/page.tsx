'use client'

export default function RealIssuancePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold">쿠폰 발행 관리</h1>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded">실무 구현</span>
      </div>

      <Section title="파일 구조">
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono leading-relaxed">{`pages/cps/base/cponmng/
  ├── CponPblMngTobe.jsx              ← 쿠폰 발행 관리
  ├── CponPblDetlRtrvTobe.jsx         ← 발행 상세 조회
  └── PblCponRtrvTobe.jsx             ← 발행쿠폰 조회

components/cps/base/cponmng/
  ├── CponPblMngTobeSearchForm.jsx    ← 검색폼
  ├── CponPblMngTobeGrid.jsx          ← 발행목록 그리드
  ├── CponPblMngTobeTable.jsx         ← 상세폼 (Tab1)
  ├── CponPblSteGrid.jsx              ← 적용사이트 (Tab2)
  ├── CponPblDetlRtrvTobeSearchForm.jsx
  ├── CponPblDetlRtrvTobeGrid.jsx
  └── CponPblDetlRtrvTobeCponGrid.jsx

api/cps/base/cponmng/
  └── cponpbl-fetch.js                ← API 호출`}</pre>
      </Section>

      <Section title="레이아웃 비교">
        <div className="grid grid-cols-2 gap-4">
          <CompareBox label="프로토타입" color="blue">
            <pre className="text-xs leading-relaxed">{`┌────────────┬──────────────────────┐
│ 발급 이력  │ 쿠폰 발급           │
│            │                      │
│ 이력 목록  │ 대상 쿠폰 [select]   │
│ (승인 쿠폰 │ 발급 수량 [input]    │
│  발급 결과) │ 메모   [input]      │
│            │        [발급 실행]   │
│            │                      │
│            │ ┌──────────────────┐ │
│            │ │ 발급 완료 N건    │ │
│            │ │ 쿠폰번호 목록   │ │
│            │ └──────────────────┘ │
└────────────┴──────────────────────┘
* 단순: 쿠폰 선택 → 수량 → 발급`}</pre>
          </CompareBox>
          <CompareBox label="실무 (FSCPS)" color="emerald">
            <pre className="text-xs leading-relaxed">{`┌─────────────────────────────────────┐
│ 타이틀          [초기화] [조회]     │
├─────────────────────────────────────┤
│ 검색: 점포 | 발행제목 | 기간       │
├─────────────────────────────────────┤
│ 발행목록 그리드              (h400) │
├──────────┬──────────────────────────┤
│ [Tab1]   │ [Tab2]                  │
│ 상세정보 │ 적용사이트              │
│          │                          │
│ 발행제목 │ 사이트 그리드           │
│ 발행유형 │ (쿠폰 적용할 점포 선택) │
│ 수량/기간│                          │
│ 할인정보 │                          │
│          │                          │
│ [발행] [저장] [초기화]              │
└──────────┴──────────────────────────┘
* 3개 화면으로 분리 (발행관리/상세조회/쿠폰조회)
* 적용사이트 별도 탭으로 관리`}</pre>
          </CompareBox>
        </div>
      </Section>

      <Section title="핵심 차이점">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-3 py-2 text-left w-32">항목</th>
              <th className="border border-gray-200 px-3 py-2 text-left">프로토타입</th>
              <th className="border border-gray-200 px-3 py-2 text-left">실무 (FSCPS)</th>
            </tr>
          </thead>
          <tbody>
            <DiffRow label="화면 수" proto="1개 (/issuance)" real="3개 (발행관리/상세조회/쿠폰조회)" />
            <DiffRow label="발급 방식" proto="수량 입력 → 일괄 생성" real="발행 마스터 등록 → 적용사이트 매핑" />
            <DiffRow label="쿠폰번호" proto="클라이언트 타임스탬프 기반" real="서버 시퀀스 기반 (바코드 연동)" />
            <DiffRow label="적용사이트" proto="쿠폰 마스터의 조건 참조" real="발행 시 별도 사이트 그리드 선택" />
            <DiffRow label="발행유형" proto="없음 (단일)" real="선착순/타겟/자동 등 유형 구분" />
            <DiffRow label="수량 제어" proto="최대 100건 고정" real="1인당 발행한도, 총발행한도, 1인당사용한도" />
            <DiffRow label="탭 전환" proto="없음" real="변경사항 확인 (changeCheck) 후 전환" />
            <DiffRow label="검색" proto="없음" real="점포, 발행제목, 기간 복합 검색" />
          </tbody>
        </table>
      </Section>

      <Section title="실무 코드 패턴 (탭 전환 + 변경 체크)">
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono leading-relaxed">{`// CponPblMngTobe.jsx - 탭 전환 시 변경사항 체크 패턴
const [activeTab, setActiveTab] = useState(0)
const changeCheckRef = useRef(false)

const handleTabChange = async (newTab) => {
  // 수정 중인 데이터가 있으면 confirm
  if (changeCheckRef.current) {
    const ok = await useConfirm(
      '변경사항이 저장되지 않았습니다.\\n탭을 전환하시겠습니까?'
    )
    if (!ok) return
  }
  setActiveTab(newTab)
  changeCheckRef.current = false
}

// 적용사이트 탭 - 발행 행 클릭 시 동적 로딩
const handleGridRowClick = async (row) => {
  const siteList = await ApiCponPblSteLst({
    cpnPblId: row.cpnPblId
  })
  setSiteData(siteList)
}`}</pre>
      </Section>

      <Section title="관련 화면 (실무에만 존재)">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="border rounded p-3">
            <div className="font-medium mb-1">발행 상세 조회 (CponPblDetlRtrvTobe)</div>
            <p className="text-gray-500 text-xs">좌: 발행목록(lg) / 우: 발행쿠폰(sm) 구조. 마스터 클릭 시 개별 쿠폰 목록 조회.</p>
          </div>
          <div className="border rounded p-3">
            <div className="font-medium mb-1">발행쿠폰 조회 (PblCponRtrvTobe)</div>
            <p className="text-gray-500 text-xs">쿠폰번호/상태/할인구분으로 검색. 개별 쿠폰 단위 조회 화면.</p>
          </div>
        </div>
      </Section>

      {/* 교과서적 구현 패턴 비교 */}
      <div className="border-t-4 border-purple-300 mt-8 pt-6">
        <div className="flex items-center gap-3 mb-4">
          <h2 className="text-lg font-bold">교과서적 구현 패턴 vs FSCPS</h2>
          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs rounded">아키텍처 분석</span>
        </div>
      </div>

      <Section title="결론: FSCPS ≈ 교과서적 구현">
        <div className="border rounded p-4 bg-purple-50 mb-3">
          <p className="text-sm font-medium text-purple-800 mb-2">
            FSCPS의 쿠폰 발행 관리는 교과서적 엔터프라이즈 패턴을 거의 그대로 따르고 있음
          </p>
          <p className="text-xs text-purple-700">
            Master-Detail 패턴, 3-Section 레이아웃, Maker-Checker, 서버 페이징, 탭 기반 서브뷰 등
            엔터프라이즈 CRUD의 정석 패턴을 충실히 구현. 다만 &quot;화면 분리&quot;에서 교과서보다 한 단계 더 나간 부분이 있음.
          </p>
        </div>
      </Section>

      <Section title="교과서적 엔터프라이즈 CRUD 패턴 (정석)">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border rounded p-3">
            <div className="text-xs font-medium text-purple-700 mb-2">Pattern 1: Master-Detail</div>
            <pre className="text-xs leading-relaxed bg-gray-50 p-2 rounded">{`┌─────────────────────────────┐
│ [검색폼]                    │
├─────────────────────────────┤
│ Master Grid (목록)          │
│  → 행 클릭                  │
├─────────────────────────────┤
│ Detail Form (상세)          │
│  → 조회/등록/수정/삭제      │
└─────────────────────────────┘
* 가장 기본적 CRUD 패턴
* 검색 → 목록 → 상세 흐름`}</pre>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs font-medium text-purple-700 mb-2">Pattern 2: Left-Right Split</div>
            <pre className="text-xs leading-relaxed bg-gray-50 p-2 rounded">{`┌──────────┬──────────────────┐
│ [검색]   │ Detail Form      │
├──────────┤                  │
│ Master   │ th | td | th| td │
│ Grid     │ ──┼────┼───┼──── │
│          │ th | td | th| td │
│ 행 클릭→ │                  │
│          │ [신규][저장][삭제]│
└──────────┴──────────────────┘
* FSCPS 표준 레이아웃
* component-sm + component-lg`}</pre>
          </div>
          <div className="border rounded p-3">
            <div className="text-xs font-medium text-purple-700 mb-2">Pattern 3: Master-Detail + Sub-Tab</div>
            <pre className="text-xs leading-relaxed bg-gray-50 p-2 rounded">{`┌─────────────────────────────┐
│ [검색폼]        [초기화][조회]│
├─────────────────────────────┤
│ Master Grid                  │
├──────────┬──────────────────┤
│ [Tab1]   │ [Tab2]   [Tab3] │
│ 기본정보  │ 연관테이블       │
│ (1:1)    │ (1:N)           │
│          │ Sub Grid        │
│ [저장]   │ [추가][삭제]    │
└──────────┴──────────────────┘
* FSCPS 쿠폰 발행이 이 패턴
* 마스터:상세 = 1:1, 1:N 혼합`}</pre>
          </div>
        </div>
      </Section>

      <Section title="교과서 체크리스트: FSCPS 달성도">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-purple-50">
              <th className="border border-gray-200 px-3 py-2 text-left w-8">V</th>
              <th className="border border-gray-200 px-3 py-2 text-left w-40">교과서 원칙</th>
              <th className="border border-gray-200 px-3 py-2 text-left">설명</th>
              <th className="border border-gray-200 px-3 py-2 text-left w-24">FSCPS</th>
            </tr>
          </thead>
          <tbody>
            <CheckRow
              check
              principle="3-Section Layout"
              desc="검색폼 → 그리드 → 상세폼 으로 단계적 정보 접근"
              status="완벽 준수"
            />
            <CheckRow
              check
              principle="Master-Detail"
              desc="마스터(발행목록) 행 클릭 → 상세(발행정보+적용사이트) 연동"
              status="완벽 준수"
            />
            <CheckRow
              check
              principle="Maker-Checker"
              desc="등록자 ≠ 승인자, 승인(Y) 후에만 발행 가능"
              status="완벽 준수"
            />
            <CheckRow
              check
              principle="서버 페이징"
              desc="대용량 대비 PaginationTabulator, 서버에서 page/size 처리"
              status="완벽 준수"
            />
            <CheckRow
              check
              principle="탭 기반 서브뷰"
              desc="1:1(기본정보) + 1:N(적용사이트) 관계를 탭으로 분리"
              status="완벽 준수"
            />
            <CheckRow
              check
              principle="Dirty Check"
              desc="탭/행 전환 시 미저장 변경사항 confirm 확인"
              status="완벽 준수"
            />
            <CheckRow
              check
              principle="서버 시퀀스"
              desc="쿠폰번호를 서버 DB 시퀀스로 생성 (바코드 연동 가능)"
              status="완벽 준수"
            />
            <CheckRow
              check
              principle="역할 기반 버튼"
              desc="권한/상태에 따라 버튼 활성/비활성 제어"
              status="완벽 준수"
            />
            <CheckRow
              check={false}
              principle="단일 화면 원칙"
              desc="하나의 업무 = 하나의 화면. FSCPS는 3개 화면으로 분리 (관리/상세/쿠폰)"
              status="초과 분리"
            />
            <CheckRow
              check={false}
              principle="상태 시각화"
              desc="현재 상태가 전체 흐름에서 어디인지 한눈에 표시 (흐름도)"
              status="미구현"
            />
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-2">
          10개 원칙 중 8개 완벽 준수. FSCPS는 교과서적 구현의 90% 수준.
        </p>
      </Section>

      <Section title="교과서 vs FSCPS vs 프로토타입 — 3종 비교">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-3 py-2 text-left w-28">항목</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-purple-700">교과서 (정석)</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-emerald-700">FSCPS (실무)</th>
              <th className="border border-gray-200 px-3 py-2 text-left text-blue-700">프로토타입</th>
            </tr>
          </thead>
          <tbody>
            <TripleRow
              label="레이아웃"
              textbook="검색+그리드+상세 (3-Section)"
              fscps="검색+그리드+탭(상세+사이트) ← 교과서+α"
              proto="좌우 분할 (이력+발급폼)"
            />
            <TripleRow
              label="화면 수"
              textbook="1~2개 (CRUD + 조회)"
              fscps="3개 (관리/상세조회/쿠폰조회)"
              proto="1개"
            />
            <TripleRow
              label="데이터 흐름"
              textbook="마스터 → 디테일 (1:N FK)"
              fscps="발행마스터 → 적용사이트 → 개별쿠폰 (1:N:N)"
              proto="쿠폰 선택 → 수량 → 일괄생성"
            />
            <TripleRow
              label="검색"
              textbook="복합 검색폼 (필수조건 포함)"
              fscps="점포+발행제목+기간 (교과서적)"
              proto="없음"
            />
            <TripleRow
              label="그리드"
              textbook="서버 페이징 그리드"
              fscps="PaginationTabulator (교과서적)"
              proto="div 리스트"
            />
            <TripleRow
              label="상세폼"
              textbook="th/td 테이블, react-hook-form"
              fscps="th/td + useForm + Controller (교과서적)"
              proto="input 직접 바인딩"
            />
            <TripleRow
              label="저장 패턴"
              textbook="마스터 저장 → 디테일 일괄저장"
              fscps="발행 저장 → 사이트 저장 (분리)"
              proto="단일 POST"
            />
            <TripleRow
              label="번호 채번"
              textbook="서버 시퀀스 / UUID v7"
              fscps="서버 시퀀스 (바코드 연동)"
              proto="타임스탬프 기반"
            />
            <TripleRow
              label="권한 체크"
              textbook="Maker-Checker (등록≠승인)"
              fscps="등록자≠승인자, 승인 후 발행"
              proto="없음 (누구나 가능)"
            />
          </tbody>
        </table>
      </Section>

      <Section title="교과서적 쿠폰 발급 시퀀스 (정석 패턴)">
        <div className="bg-gray-50 border rounded p-4 mb-3">
          <div className="flex items-start gap-6">
            <div className="flex-1">
              <div className="text-xs font-medium text-purple-700 mb-2">Phase 1: 발행 마스터 등록</div>
              <div className="space-y-1 text-xs">
                <Step n={1} text="검색폼에서 기존 발행 조회 또는 [신규] 클릭" />
                <Step n={2} text="상세폼에 발행제목, 유형, 수량, 기간 입력" />
                <Step n={3} text="[저장] → INSERT coupon_issuance (FK: coupon_master.id)" />
                <Step n={4} text="상태: DRAFT (임시저장)" />
              </div>
            </div>
            <div className="text-gray-300 self-center text-2xl">&rarr;</div>
            <div className="flex-1">
              <div className="text-xs font-medium text-purple-700 mb-2">Phase 2: 적용 범위 설정</div>
              <div className="space-y-1 text-xs">
                <Step n={5} text="Tab2(적용사이트) 전환 → 사이트 그리드 표시" />
                <Step n={6} text="사이트 체크박스 선택 → [저장]" />
                <Step n={7} text="DELETE + INSERT (기존 패턴과 동일)" />
                <Step n={8} text="1:N 관계 일괄 저장 완료" />
              </div>
            </div>
            <div className="text-gray-300 self-center text-2xl">&rarr;</div>
            <div className="flex-1">
              <div className="text-xs font-medium text-purple-700 mb-2">Phase 3: 발행 실행</div>
              <div className="space-y-1 text-xs">
                <Step n={9} text="[발행] 클릭 → confirm 팝업" />
                <Step n={10} text="서버: 수량만큼 개별 쿠폰 INSERT (트랜잭션)" />
                <Step n={11} text="각 쿠폰에 서버 시퀀스 번호 부여" />
                <Step n={12} text="상태: ISSUED → 사용현황에서 추적 가능" />
              </div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          교과서적 패턴에서 발급은 3단계 프로세스. FSCPS는 이 패턴을 거의 그대로 따름.
          프로토타입은 Phase 1~2를 생략하고 Phase 3만 구현한 간소화 버전.
        </p>
      </Section>

      <Section title="교과서에서 FSCPS가 &quot;초과&quot;한 부분">
        <div className="grid grid-cols-2 gap-4">
          <div className="border rounded p-4 bg-yellow-50">
            <div className="font-medium text-yellow-800 text-sm mb-2">화면 3개 분리 (Over-engineering?)</div>
            <div className="text-xs text-yellow-700 space-y-2">
              <p>교과서: 발행관리 + 발행조회 = <strong>2개면 충분</strong></p>
              <p>FSCPS: 발행관리 + 발행상세조회 + 발행쿠폰조회 = <strong>3개</strong></p>
              <p className="border-t pt-2 text-yellow-600">
                &quot;발행상세조회&quot;와 &quot;발행쿠폰조회&quot;는 하나로 합칠 수 있음.
                BUT 운영팀 요청으로 분리한 것이라면 합리적 판단.
              </p>
            </div>
          </div>
          <div className="border rounded p-4 bg-green-50">
            <div className="font-medium text-green-800 text-sm mb-2">교과서보다 나은 부분</div>
            <div className="text-xs text-green-700 space-y-2">
              <p>- 적용사이트 탭: 1:N 관계를 탭으로 깔끔하게 분리</p>
              <p>- changeCheck: 미저장 데이터 유실 방지 (UX 배려)</p>
              <p>- 수량 제어: 1인당 한도, 총한도, 사용한도 3중 제어</p>
              <p className="border-t pt-2 text-green-600">
                교과서는 원칙만 제시. 실무는 원칙 + 비즈니스 요구사항 반영.
              </p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="프로토타입을 교과서적으로 개선한다면?">
        <div className="grid grid-cols-2 gap-4">
          <CompareBox label="현재 프로토타입" color="blue">
            <pre className="text-xs leading-relaxed">{`┌────────────┬──────────────────────┐
│ 발급 이력  │ 쿠폰 발급           │
│ (리스트)   │ select+input+btn    │
│            │ + 결과 테이블       │
└────────────┴──────────────────────┘
* 쿠폰 선택 → 수량 → 바로 발급
* 1단계 프로세스`}</pre>
          </CompareBox>
          <CompareBox label="교과서적 개선안" color="purple">
            <pre className="text-xs leading-relaxed">{`┌─────────────────────────────────────┐
│ [검색] 쿠폰명 | 기간 | [초기화][조회]│
├─────────────────────────────────────┤
│ 발행 마스터 목록 (Grid)             │
│ No | 발행제목 | 쿠폰명 | 수량 | 상태│
├──────────┬──────────────────────────┤
│ [기본정보]│ [발급쿠폰]             │
│ 발행제목 │ No | 쿠폰번호 | 상태   │
│ 대상쿠폰 │    |          |        │
│ 수량/메모│                         │
│          │                         │
│ [신규][저장][발행]                  │
└──────────┴──────────────────────────┘
* 3-Section: 검색 → 그리드 → 상세
* Master-Detail 패턴 적용
* 발행 마스터를 먼저 저장 → 발행 실행 분리`}</pre>
          </CompareBox>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          교과서적 개선의 핵심: <strong>&quot;발행 마스터 등록&quot;과 &quot;발행 실행&quot;을 분리</strong>.
          현재 프로토타입은 &quot;선택 → 바로 발급&quot;으로 2개 단계를 하나로 합침.
          실무에서는 발행 계획을 먼저 등록하고, 검토 후 발행하는 것이 정석.
        </p>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded border mb-4">
      <div className="p-3 border-b bg-gray-50"><span className="font-medium text-sm">{title}</span></div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function CompareBox({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className="border rounded">
      <div className={`px-3 py-1.5 border-b bg-${color}-50 text-${color}-800 text-xs font-medium`}>{label}</div>
      <div className="p-3 bg-gray-50">{children}</div>
    </div>
  )
}

function DiffRow({ label, proto, real }: { label: string; proto: string; real: string }) {
  return (
    <tr>
      <td className="border border-gray-200 px-3 py-2 font-medium bg-gray-50 whitespace-nowrap">{label}</td>
      <td className="border border-gray-200 px-3 py-2 text-blue-700">{proto}</td>
      <td className="border border-gray-200 px-3 py-2 text-emerald-700">{real}</td>
    </tr>
  )
}

function CheckRow({ check, principle, desc, status }: { check: boolean; principle: string; desc: string; status: string }) {
  return (
    <tr>
      <td className="border border-gray-200 px-3 py-2 text-center">
        <span className={check ? 'text-green-600' : 'text-orange-500'}>{check ? 'O' : 'X'}</span>
      </td>
      <td className="border border-gray-200 px-3 py-2 font-medium whitespace-nowrap">{principle}</td>
      <td className="border border-gray-200 px-3 py-2 text-gray-600">{desc}</td>
      <td className={`border border-gray-200 px-3 py-2 text-xs font-medium whitespace-nowrap ${check ? 'text-green-700' : 'text-orange-600'}`}>
        {status}
      </td>
    </tr>
  )
}

function TripleRow({ label, textbook, fscps, proto }: { label: string; textbook: string; fscps: string; proto: string }) {
  return (
    <tr>
      <td className="border border-gray-200 px-3 py-2 font-medium bg-gray-50 whitespace-nowrap">{label}</td>
      <td className="border border-gray-200 px-3 py-2 text-purple-700 text-xs">{textbook}</td>
      <td className="border border-gray-200 px-3 py-2 text-emerald-700 text-xs">{fscps}</td>
      <td className="border border-gray-200 px-3 py-2 text-blue-700 text-xs">{proto}</td>
    </tr>
  )
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <span className="flex-shrink-0 w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-[10px] font-bold">{n}</span>
      <span className="text-gray-700">{text}</span>
    </div>
  )
}
