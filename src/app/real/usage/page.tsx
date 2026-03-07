'use client'

export default function RealUsagePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold">쿠폰 사용 내역 조회</h1>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded">실무 구현</span>
      </div>

      <Section title="파일 구조">
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono leading-relaxed">{`pages/cps/base/cponmng/
  ├── CponUseDetlRtrvTobe.jsx         ← 사용 상세 내역 조회
  └── CponUseHstRtrvTobe.jsx          ← 사용 이력 조회

components/cps/base/cponmng/
  ├── CponUseDetlRtrvTobeSearchForm.jsx
  ├── CponUseDetlRtrvTobeGrid.jsx
  ├── CponUseHstRtrvTobeSearchForm.jsx
  └── CponUseHstRtrvTobeGrid.jsx

api/cps/base/cponmng/
  └── cponuse-fetch.js                ← API 호출`}</pre>
      </Section>

      <Section title="레이아웃 비교">
        <div className="grid grid-cols-2 gap-4">
          <CompareBox label="프로토타입" color="blue">
            <pre className="text-xs leading-relaxed">{`┌────────────────────────────────────┐
│ [총발급] [사용] [미사용] [만료] [%]│ ← 통계 카드 5개
├────────────────────────────────────┤
│ 쿠폰별 집계 테이블                 │
│ 쿠폰명 | 총발급 | 사용 | 미사용   │
│         |       |      | [진행바] │
├────────────────────────────────────┤
│ 발급 쿠폰 상세 (필터: 쿠폰/상태)  │
│ No | 쿠폰번호 | 쿠폰명 | 상태 ...│
└────────────────────────────────────┘
* 단일 화면에 통계 + 집계 + 상세
* 클라이언트 사이드 필터링`}</pre>
          </CompareBox>
          <CompareBox label="실무 (FSCPS)" color="emerald">
            <pre className="text-xs leading-relaxed">{`[사용 상세 내역 조회]
┌─────────────────────────────────────┐
│ 타이틀 [매뉴얼📄]  [초기화] [조회]  │
├─────────────────────────────────────┤
│ 검색: 매출일자*(필수) | 점포 |      │
│       상점 | 쿠폰번호 | 쿠폰ID |   │
│       발행제목                       │
├─────────────────────────────────────┤
│ PaginationTabulator          (h100p)│
│ (서버 페이징 그리드)                │
└─────────────────────────────────────┘

[사용 이력 조회]
┌─────────────────────────────────────┐
│ 타이틀              [초기화] [조회]  │
├─────────────────────────────────────┤
│ 검색: 발행번호 or 바코드 (1개 필수) │
├─────────────────────────────────────┤
│ PaginationTabulator          (h100p)│
└─────────────────────────────────────┘
* 2개 화면으로 분리
* 서버 사이드 페이징 (대용량)`}</pre>
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
            <DiffRow label="화면 수" proto="1개 (/usage)" real="2개 (상세내역/이력 조회)" />
            <DiffRow label="통계" proto="카드 5개 + 쿠폰별 집계표 + 프로그레스바" real="없음 (조회 목록만)" />
            <DiffRow label="검색" proto="클라이언트 필터 (쿠폰/상태)" real="서버 검색 (매출일자 필수 + 다중 조건)" />
            <DiffRow label="그리드" proto="HTML table (전체 로드)" real="PaginationTabulator (서버 페이징)" />
            <DiffRow label="데이터 양" proto="전체 로드 (소량)" real="서버 페이징 (대용량 대응)" />
            <DiffRow label="필수 조건" proto="없음 (전체 조회)" real="매출일자 필수 / 발행번호 or 바코드 필수" />
            <DiffRow label="부가 기능" proto="없음" real="매뉴얼 PDF 다운로드" />
          </tbody>
        </table>
      </Section>

      <Section title="실무 코드 패턴 (서버 페이징 + 필수 검색)">
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono leading-relaxed">{`// CponUseDetlRtrvTobe.jsx - 서버 페이징 패턴
const handleSearch = async () => {
  const params = getValues()

  // 필수 검색 조건 체크
  if (!params.saleDt) {
    useAlert('매출일자는 필수입니다.')
    return
  }

  // PaginationTabulator에 검색 파라미터 전달
  gridRef.current?.setData(
    '/api/cps/base/cponmng/v1.0/useDetlList',
    params
  )
  // → Tabulator가 자동으로 page, size 파라미터 추가하여 호출
  // → 서버에서 { data: [...], totalCount: 1234 } 응답
  // → Tabulator가 페이지네이션 UI 자동 생성
}

// PaginationTabulator vs SimpleTabulator
// - SimpleTabulator: 전체 데이터 클라이언트 로드 (소량)
// - PaginationTabulator: 서버 페이징 (대용량)
//   → 쿠폰 사용 내역은 대용량이므로 Pagination 사용`}</pre>
      </Section>

      <Section title="프로토타입 강점 vs 실무 강점">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="border rounded p-4 bg-blue-50">
            <div className="font-medium text-blue-800 mb-2">프로토타입만의 장점</div>
            <ul className="space-y-1 text-blue-700 text-xs">
              <li>- 통계 카드로 한눈에 현황 파악</li>
              <li>- 쿠폰별 집계 + 사용률 프로그레스바</li>
              <li>- 별도 검색 없이 바로 전체 데이터 표시</li>
              <li>- 실무 제안 가능: 대시보드 성격 화면</li>
            </ul>
          </div>
          <div className="border rounded p-4 bg-emerald-50">
            <div className="font-medium text-emerald-800 mb-2">실무만의 장점</div>
            <ul className="space-y-1 text-emerald-700 text-xs">
              <li>- 서버 페이징으로 대용량 데이터 대응</li>
              <li>- 필수 검색 조건으로 불필요한 전체 조회 방지</li>
              <li>- 용도별 화면 분리 (상세내역 vs 이력)</li>
              <li>- 매뉴얼 PDF 다운로드 제공</li>
            </ul>
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
