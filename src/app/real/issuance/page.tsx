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
