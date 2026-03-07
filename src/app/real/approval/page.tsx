'use client'

export default function RealApprovalPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-xl font-bold">쿠폰 마스터 승인 관리</h1>
        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs rounded">실무 구현</span>
      </div>

      <Section title="파일 구조">
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono leading-relaxed">{`pages/cps/base/cponmng/
  └── CponMstAprvMngTobe.jsx              ← 페이지

components/cps/base/cponmng/
  ├── CponMstAprvMngTobeSearchForm.jsx    ← 검색폼
  ├── CponMstAprvMngTobeGrid.jsx          ← 목록 그리드
  └── CponMstAprvMngTobeDetail.jsx        ← 상세 + 승인 버튼`}</pre>
      </Section>

      <Section title="레이아웃 비교">
        <div className="grid grid-cols-2 gap-4">
          <CompareBox label="프로토타입" color="blue">
            <pre className="text-xs leading-relaxed">{`┌────────────┬─────────────────────┐
│ 쿠폰 목록  │ 승인 상세           │
│ (필터)     │                     │
│            │ 쿠폰 기본정보 테이블 │
│ 전체/생성/ │                     │
│ 승인요청/  │ 상태 흐름도         │
│ 승인/반려/ │ [C]→[W]→[Y]→[T]   │
│ 강제중지   │       └→[R]        │
│            │                     │
│            │ [승인요청] [승인]... │
└────────────┴─────────────────────┘
* 상태 흐름도 시각화 (프로토만)`}</pre>
          </CompareBox>
          <CompareBox label="실무 (FSCPS)" color="emerald">
            <pre className="text-xs leading-relaxed">{`┌─────────────────────────────────────┐
│ 타이틀          [초기화] [조회]     │
├─────────────────────────────────────┤
│ 검색: 점포 | 쿠폰명 | 승인상태     │
├────────────┬────────────────────────┤
│ 목록 (sm)  │ 상세정보 (lg h100p)   │
│            │                       │
│ Tabulator  │ 쿠폰 기본정보 테이블  │
│ Grid       │ 발행/사용 기간 정보   │
│            │ 시간대/요일 조건       │
│            │                       │
│            │ [승인요청][요청취소]   │
│            │ [승인][반려][강제중지] │
└────────────┴────────────────────────┘
* 상태별 버튼 활성/비활성 제어
* 등록자/승인자 구분`}</pre>
          </CompareBox>
        </div>
      </Section>

      <Section title="상태 전이 비교">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-200 px-3 py-2 text-left w-28">현재 상태</th>
              <th className="border border-gray-200 px-3 py-2 text-left">프로토타입</th>
              <th className="border border-gray-200 px-3 py-2 text-left">실무 (FSCPS)</th>
            </tr>
          </thead>
          <tbody>
            <DiffRow label="C (생성)" proto="→ W (승인요청)" real="→ W (승인요청)" />
            <DiffRow label="W (승인요청)" proto="→ Y (승인) / R (반려)" real="→ Y (승인) / R (반려) / Q (승인취소)" />
            <DiffRow label="Q (승인취소)" proto="없음" real="→ W (재승인요청)" />
            <DiffRow label="Y (승인)" proto="→ T (강제중지)" real="→ T (강제중지) + cpnPsbtYn='N'" />
            <DiffRow label="R (반려)" proto="→ W (재승인요청)" real="종료 (재요청 불가)" />
            <DiffRow label="T (강제중지)" proto="종료" real="종료 + 발행쿠폰 일괄 사용불가" />
          </tbody>
        </table>
        <p className="text-xs text-gray-500 mt-2">
          실무는 Q(승인취소) 상태가 추가로 존재하며, 반려(R) 시 재요청 불가.
          프로토타입은 R→W 재요청을 허용하는 간소화 버전.
        </p>
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
            <DiffRow label="상태 코드" proto="5개 (C/W/Y/R/T)" real="6개 (C/W/Q/Y/R/T)" />
            <DiffRow label="권한 구분" proto="없음 (누구나 승인)" real="등록자 ≠ 승인자 (역할 분리)" />
            <DiffRow label="승인 시" proto="apprvCd만 변경" real="apprvCd + cpnPsbtYn + cpnApprvId 변경" />
            <DiffRow label="상태 시각화" proto="흐름도 + 현재 위치 하이라이트" real="없음 (버튼만 표시) ← 이것만 추가하면 프로토와 동일 수준" />
            <DiffRow label="confirm" proto="window.confirm()" real="useConfirm() 커스텀 팝업" />
            <DiffRow label="상세 정보" proto="기본 4행 테이블" real="기초정보 + 기간 + 시간대/요일 전체 표시" />
          </tbody>
        </table>
      </Section>

      <Section title="실무 개선 제안: 상태 흐름도 추가">
        <div className="border rounded p-4 bg-yellow-50 mb-3">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            실무 화면에 아래와 같은 상태 흐름도를 추가하면 프로토타입과 거의 동일 수준
          </p>
          <p className="text-xs text-yellow-700 mb-3">
            현재 실무는 버튼만 존재하여 &quot;지금 뭘 할 수 있는지&quot;는 알 수 있지만
            &quot;전체 흐름에서 어디에 있는지&quot;를 한눈에 파악하기 어려움
          </p>
        </div>
        <div className="bg-gray-50 border rounded p-4">
          <span className="text-sm font-medium block mb-3">프로토타입의 상태 흐름도 (실무에도 적용 가능)</span>
          <div className="flex items-center gap-2 text-xs flex-wrap mb-2">
            {['C: 생성', 'W: 승인요청', 'Q: 승인취소', 'Y: 승인', 'R: 반려', 'T: 강제중지'].map((s, i) => {
              const code = s.split(':')[0]
              const colors: Record<string, string> = {
                C: 'bg-gray-200 text-gray-700',
                W: 'bg-yellow-100 text-yellow-800',
                Q: 'bg-orange-100 text-orange-800',
                Y: 'bg-green-100 text-green-800',
                R: 'bg-red-100 text-red-800',
                T: 'bg-gray-500 text-white',
              }
              return (
                <span key={code}>
                  <span className={`inline-block px-3 py-1.5 rounded ${colors[code]}`}>{s}</span>
                  {i < 5 && <span className="mx-1 text-gray-300">&rarr;</span>}
                </span>
              )
            })}
          </div>
          <p className="text-xs text-gray-400">
            C &rarr; W (승인요청), W &rarr; Q (취소) / Y (승인) / R (반려), Y &rarr; T (강제중지)
          </p>
          <p className="text-xs text-gray-500 mt-2">
            현재 상태에 ring-2 하이라이트만 추가하면 운영자가 즉시 맥락 파악 가능.
            구현 난이도 낮음 (CSS만으로 가능), 사이드이펙트 없음.
          </p>
        </div>
      </Section>

      <Section title="실무 코드 패턴 (상태별 버튼 제어)">
        <pre className="bg-gray-900 text-green-400 p-4 rounded text-xs font-mono leading-relaxed">{`// CponMstAprvMngTobeDetail.jsx - 버튼 활성 로직
const apprvCd = watch('cpnApprvCd')

// 상태별 버튼 표시 조건
const showBtnRequest   = apprvCd === 'C' || apprvCd === 'Q'  // 승인요청
const showBtnCancel    = apprvCd === 'W'                      // 요청취소
const showBtnApprove   = apprvCd === 'W'                      // 승인
const showBtnReject    = apprvCd === 'W'                      // 반려
const showBtnForceStop = apprvCd === 'Y'                      // 강제중지

// 승인 처리 시 발행 가능 플래그도 함께 변경
const handleApprove = async () => {
  const ok = await useConfirm('승인 처리하시겠습니까?')
  if (!ok) return
  await apiCpnMstUpdate({
    cpnApprvCd: 'Y',
    cpnPsbtYn: 'Y',           // ← 발행 가능
    cpnApprvId: loginUserId,   // ← 승인자 ID 기록
  })
}`}</pre>
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
