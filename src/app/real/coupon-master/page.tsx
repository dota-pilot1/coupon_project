'use client'

export default function RealCouponMasterPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold">쿠폰 마스터 관리</h1>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded">실무 구현</span>
      </div>

      {/* 파일 구조 */}
      <Section title="파일 구조">
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono leading-relaxed">{`pages/cps/base/cponmng/
  └── CponMstMngTobe.jsx              ← 페이지 (컨테이너)

components/cps/base/cponmng/
  ├── CponMstMngTobeSearchForm.jsx    ← 검색폼
  ├── CponMstMngTobeGrid.jsx          ← 목록 그리드
  ├── CponMstMngTobeTab1.jsx          ← 기초정보 탭
  ├── CponMstMngTobeTab2.jsx          ← 발행/사용 탭
  └── CponMstMngTobeTab3.jsx          ← 사용제한 탭

api/cps/base/cponmng/
  └── cpnmst-fetch.js                 ← API 호출`}</pre>
      </Section>

      {/* 레이아웃 */}
      <Section title="레이아웃 비교">
        <div className="grid grid-cols-2 gap-4">
          <CompareBox label="프로토타입" color="blue">
            <pre className="text-xs leading-relaxed">{`┌──────────────────────────────────┐
│ 쿠폰 목록 (35%) │ 상세정보 (65%) │
│                  │               │
│ [목록 클릭]      │ 기초정보 폼    │
│                  │ 사용제한 (탭)  │
│                  │ 유효기간 제어  │
└──────────────────────────────────┘
* 단일 폼에 모든 정보 표시`}</pre>
          </CompareBox>
          <CompareBox label="실무 (FSCPS)" color="emerald">
            <pre className="text-xs leading-relaxed">{`┌─────────────────────────────────────┐
│ 타이틀          [초기화] [조회]     │
├─────────────────────────────────────┤
│ 검색: 점포 | 쿠폰명 | 승인상태     │
├──────────┬──────────────────────────┤
│ 목록     │ [Tab1] [Tab2] [Tab3]    │
│ (30%)    │                         │
│          │ Tab1: 기초정보           │
│ Grid     │   - 기본정보             │
│          │   - 발행/사용 기간       │
│          │   - 시간대/요일 제어     │
│          │                         │
│          │ Tab2: 발행 및 사용       │
│          │   - 발행유형, 수량제어   │
│          │   - 할인 설정            │
│          │                         │
│          │ Tab3: 사용제한           │
│          │   - 조건 그리드          │
│          │   [신규] [저장] [삭제]   │
└──────────┴──────────────────────────┘
* 3개 탭으로 정보 분리
* 상단 검색폼 별도 영역`}</pre>
          </CompareBox>
        </div>
      </Section>

      {/* 핵심 차이점 */}
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
            <DiffRow label="상태관리" proto="useState (로컬)" real="Recoil atom + react-hook-form" />
            <DiffRow label="검색" proto="없음 (전체 목록)" real="검색폼 (점포, 쿠폰명, 승인상태)" />
            <DiffRow label="그리드" proto="div 목록" real="SimpleTabulator (컬럼 정의)" />
            <DiffRow label="상세 폼" proto="단일 폼" real="3개 탭 (기초/발행/사용제한)" />
            <DiffRow label="API" proto="Next.js Route Handler" real="Spring Boot REST API (MyBatis)" />
            <DiffRow label="DB" proto="SQLite (Drizzle ORM)" real="PostgreSQL (MyBatis XML)" />
            <DiffRow label="검증" proto="alert()" real="useAlert, validateForm()" />
            <DiffRow label="시간대 제어" proto="input type=time" real="timeSlots 배열 + 커스텀 UI" />
            <DiffRow label="요일 제어" proto="토글 버튼 7개" real="dayOfWeek '0000000' 비트맵 동일" />
          </tbody>
        </table>
      </Section>

      {/* 코드 패턴 */}
      <Section title="실무 코드 패턴 (react-hook-form + Recoil)">
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono leading-relaxed">{`// CponMstMngTobe.jsx - 페이지 컨테이너 패턴
const CponMstMngTobe = () => {
  const formMethod = useForm({ defaultValues: { ... } })
  const { reset, getValues, setValue } = formMethod

  // Recoil로 그리드 선택 행 공유
  const [detailData, setDetailData] = useRecoilState(cponMstDetailAtom)

  // 그리드 행 클릭 → 상세 조회
  const handleRowClick = async (row) => {
    const detail = await apiCpnMstDetail(row.cpnMstId)
    reset(detail)  // react-hook-form에 데이터 바인딩
  }

  // 저장 (필수값 검증 → API 호출)
  const handleSave = async () => {
    if (!validateForm(getValues())) return
    const result = await apiCpnMstInsert(getValues())
    useAlert('저장되었습니다.')
    refetchList()
  }

  return (
    <FormProvider {...formMethod}>
      <SearchForm />
      <div className="component-wrap-2">
        <Grid onRowClick={handleRowClick} />
        <Detail />
      </div>
    </FormProvider>
  )
}`}</pre>
      </Section>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded border mb-4">
      <div className="p-3 border-b bg-gray-50">
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function CompareBox({ label, color, children }: { label: string; color: string; children: React.ReactNode }) {
  return (
    <div className={`border rounded`}>
      <div className={`px-3 py-1.5 border-b bg-${color}-50 text-${color}-800 text-xs font-medium`}>
        {label}
      </div>
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
