'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import dynamic from 'next/dynamic'
import type { ColumnDefinition } from '@/components/SimpleTabulator'

// SSR 방지 - Tabulator는 DOM 필요
const SimpleTabulator = dynamic(() => import('@/components/SimpleTabulator'), {
  ssr: false,
  loading: () => <div className="h-[400px] flex items-center justify-center text-gray-400 text-sm">로딩중...</div>,
})

type Coupon = {
  id: string
  name: string
  discountType: string
  discountValue: number
  apprvCd: string
  startDate: string | null
  endDate: string | null
}

type IssuanceRecord = {
  id: string
  couponId: string
  couponName: string
  issueTitle: string | null
  issueType: string
  issueQty: number
  validStartDate: string | null
  validEndDate: string | null
  issueDt: string
  memo: string | null
  createdAt: string
}

type IssuedCoupon = {
  id: string
  status: string
}

// 그리드 컬럼 정의 (FSCPS 패턴)
const couponColumns: ColumnDefinition[] = [
  { title: 'No.', field: 'rn', width: 50, hozAlign: 'center', headerSort: false },
  { title: '쿠폰명', field: 'name', minWidth: 120, hozAlign: 'left' },
  { title: '할인', field: 'discountDisplay', width: 90, hozAlign: 'center' },
  { title: '시작일', field: 'startDate', width: 100, hozAlign: 'center' },
  { title: '종료일', field: 'endDate', width: 100, hozAlign: 'center' },
]

const historyColumns: ColumnDefinition[] = [
  { title: 'No.', field: 'rn', width: 50, hozAlign: 'center', headerSort: false },
  { title: '발행제목', field: 'issueTitle', minWidth: 100, hozAlign: 'left' },
  { title: '유형', field: 'issueTypeDisplay', width: 70, hozAlign: 'center' },
  { title: '수량', field: 'issueQty', width: 60, hozAlign: 'center' },
  { title: '유효기간', field: 'validPeriod', width: 160, hozAlign: 'center' },
  { title: '발급일', field: 'issueDt', width: 90, hozAlign: 'center' },
  { title: '메모', field: 'memo', minWidth: 80, hozAlign: 'left' },
]

const issuedColumns: ColumnDefinition[] = [
  { title: 'No.', field: 'rn', width: 50, hozAlign: 'center', headerSort: false },
  { title: '쿠폰번호', field: 'id', minWidth: 200, hozAlign: 'left' },
  { title: '상태', field: 'statusDisplay', width: 80, hozAlign: 'center' },
]

export default function IssuancePage() {
  const queryClient = useQueryClient()
  const { confirm, alert } = useConfirmDialog()
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null)
  const [issueTitle, setIssueTitle] = useState('')
  const [issueType, setIssueType] = useState('FIRST_COME')
  const [issueQty, setIssueQty] = useState(1)
  const [validStartDate, setValidStartDate] = useState('')
  const [validEndDate, setValidEndDate] = useState('')
  const [memo, setMemo] = useState('')
  const [issuedResult, setIssuedResult] = useState<IssuedCoupon[]>([])
  const [searchName, setSearchName] = useState('')
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info')

  // 승인 완료된 쿠폰 목록
  const { data: coupons = [] } = useQuery<Coupon[]>({
    queryKey: ['approvedCoupons'],
    queryFn: () =>
      fetch('/api/approval')
        .then((r) => r.json())
        .then((list: Coupon[]) => list.filter((c) => c.apprvCd === 'Y')),
  })

  // 발급 이력
  const { data: issuances = [] } = useQuery<IssuanceRecord[]>({
    queryKey: ['issuances'],
    queryFn: () => fetch('/api/issuances').then((r) => r.json()),
  })

  const issueMutation = useMutation({
    mutationFn: (data: {
      couponId: string; issueQty: number; memo: string;
      issueTitle: string; issueType: string;
      validStartDate: string; validEndDate: string;
    }) =>
      fetch('/api/issuances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(async (r) => {
        const res = await r.json()
        if (!r.ok) throw new Error(res.error)
        return res
      }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['issuances'] })
      setIssuedResult(result.coupons || [])
      setActiveTab('history')
    },
    onError: (err: Error) => {
      alert(err.message, '오류')
    },
  })

  const handleIssue = async () => {
    if (!selectedCoupon) {
      await alert('좌측 목록에서 쿠폰을 선택하세요.', '안내')
      return
    }
    if (issueQty < 1 || issueQty > 100) {
      await alert('발급 수량은 1~100 사이로 입력하세요.', '입력 오류')
      return
    }
    const ok = await confirm({
      title: '쿠폰 발급',
      description: `[${selectedCoupon.name}] ${issueQty}건을 발급하시겠습니까?`,
    })
    if (!ok) return
    issueMutation.mutate({
      couponId: selectedCoupon.id, issueQty, memo,
      issueTitle, issueType, validStartDate, validEndDate,
    })
  }

  const handleCouponRowClick = (row: Record<string, unknown>) => {
    const coupon = coupons.find((c) => c.id === row.id)
    if (coupon) {
      setSelectedCoupon(coupon)
      setIssueTitle('')
      setIssueType('FIRST_COME')
      setIssueQty(1)
      setValidStartDate(coupon.startDate || '')
      setValidEndDate(coupon.endDate || '')
      setMemo('')
      setIssuedResult([])
      setActiveTab('info')
    }
  }

  const handleNew = () => {
    setSelectedCoupon(null)
    setIssueTitle('')
    setIssueType('FIRST_COME')
    setIssueQty(1)
    setValidStartDate('')
    setValidEndDate('')
    setMemo('')
    setIssuedResult([])
    setActiveTab('info')
  }

  // 검색 필터 + 그리드 데이터 변환
  const couponGridData = useMemo(() => {
    return coupons
      .filter((c) =>
        searchName ? c.name.toLowerCase().includes(searchName.toLowerCase()) : true
      )
      .map((c, i) => ({
        ...c,
        rn: i + 1,
        discountDisplay:
          c.discountType === 'RATE' ? `${c.discountValue}%` : `${c.discountValue.toLocaleString()}원`,
        startDate: c.startDate || '-',
        endDate: c.endDate || '-',
      }))
  }, [coupons, searchName])

  // 선택된 쿠폰의 발급 이력
  const historyGridData = useMemo(() => {
    if (!selectedCoupon) return []
    const typeLabels: Record<string, string> = {
      FIRST_COME: '선착순',
      TARGET: '타겟',
      AUTO: '자동',
    }
    return issuances
      .filter((iss) => iss.couponId === selectedCoupon.id)
      .map((iss, i) => ({
        ...iss,
        rn: i + 1,
        issueTitle: iss.issueTitle || '-',
        issueTypeDisplay: typeLabels[iss.issueType] || iss.issueType,
        validPeriod: iss.validStartDate && iss.validEndDate
          ? `${iss.validStartDate} ~ ${iss.validEndDate}`
          : '-',
        memo: iss.memo || '-',
      }))
  }, [issuances, selectedCoupon])

  // 발급 결과 그리드 데이터
  const issuedGridData = useMemo(() => {
    return issuedResult.map((c, i) => ({
      ...c,
      rn: i + 1,
      statusDisplay: c.status === 'UNUSED' ? '미사용' : c.status,
    }))
  }, [issuedResult])

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 타이틀 + 검색 (FSCPS 3-Section 상단) */}
      <div className="bg-white rounded border mb-4">
        <div className="flex items-center justify-between p-3">
          <h1 className="text-lg font-bold">쿠폰 발급</h1>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500">쿠폰명</label>
            <input
              type="text"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              placeholder="검색어 입력"
              className="border rounded px-3 py-1.5 text-sm w-48"
            />
            <button
              onClick={() => setSearchName('')}
              className="px-3 py-1.5 border rounded text-sm hover:bg-gray-100"
            >
              초기화
            </button>
          </div>
        </div>
      </div>

      {/* 좌우 분할 (FSCPS component-wrap-2 패턴) */}
      <div className="flex gap-4">
        {/* 좌측: 승인 쿠폰 목록 (component-sm) */}
        <div className="w-[40%] min-w-[350px] bg-white rounded border">
          <div className="p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">
              승인 쿠폰 목록
            </span>
            <span className="text-gray-400 text-sm ml-2">총 {couponGridData.length}건</span>
          </div>
          <SimpleTabulator
            columns={couponColumns}
            data={couponGridData}
            height={500}
            onRowClick={handleCouponRowClick}
            selectedRowId={selectedCoupon?.id ?? null}
            placeholder="승인 완료(Y)된 쿠폰이 없습니다."
          />
        </div>

        {/* 우측: 상세 + 발급 (component-lg) */}
        <div className="flex-1 bg-white rounded border">
          <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {/* 탭 (FSCPS tab 패턴) */}
              <button
                onClick={() => setActiveTab('info')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeTab === 'info'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                발급 정보
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`px-3 py-1 rounded text-sm transition-colors ${
                  activeTab === 'history'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-500 hover:bg-gray-200'
                }`}
              >
                발급 이력 ({historyGridData.length})
              </button>
            </div>
            <div className="flex gap-1">
              <button
                onClick={handleNew}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-100"
              >
                초기화
              </button>
              {activeTab === 'info' && (
                <button
                  onClick={handleIssue}
                  disabled={issueMutation.isPending || !selectedCoupon}
                  className="px-4 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {issueMutation.isPending ? '발급중...' : '발급 실행'}
                </button>
              )}
            </div>
          </div>

          {activeTab === 'info' ? (
            <div className="p-4">
              {/* 쿠폰 기본 정보 (읽기 전용) */}
              <div className="text-xs text-gray-400 mb-1">쿠폰 기본정보</div>
              <table className="w-full border-collapse text-sm mb-4">
                <tbody>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                      쿠폰명
                    </th>
                    <td className="border border-gray-200 px-3 py-2">
                      {selectedCoupon ? (
                        <span className="font-medium">{selectedCoupon.name}</span>
                      ) : (
                        <span className="text-gray-400">좌측 목록에서 쿠폰을 선택하세요</span>
                      )}
                    </td>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                      할인 정보
                    </th>
                    <td className="border border-gray-200 px-3 py-2">
                      {selectedCoupon
                        ? selectedCoupon.discountType === 'RATE'
                          ? `${selectedCoupon.discountValue}% 할인`
                          : `${selectedCoupon.discountValue.toLocaleString()}원 할인`
                        : '-'}
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                      마스터 유효기간
                    </th>
                    <td className="border border-gray-200 px-3 py-2 text-gray-500" colSpan={3}>
                      {selectedCoupon
                        ? `${selectedCoupon.startDate || '-'} ~ ${selectedCoupon.endDate || '-'}`
                        : '-'}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 발행 입력 폼 (FSCPS 패턴: 발행 건별 설정) */}
              <div className="text-xs text-gray-400 mb-1">발행 정보 입력</div>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                      발행제목
                    </th>
                    <td className="border border-gray-200 px-3 py-1" colSpan={3}>
                      <input
                        type="text"
                        value={issueTitle}
                        onChange={(e) => setIssueTitle(e.target.value)}
                        placeholder="예: 3월 봄맞이 이벤트"
                        disabled={!selectedCoupon}
                        className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                      발행유형 <span className="text-red-500">*</span>
                    </th>
                    <td className="border border-gray-200 px-3 py-1">
                      <select
                        value={issueType}
                        onChange={(e) => setIssueType(e.target.value)}
                        disabled={!selectedCoupon}
                        className="border rounded px-2 py-1 disabled:bg-gray-100"
                      >
                        <option value="FIRST_COME">선착순</option>
                        <option value="TARGET">타겟</option>
                        <option value="AUTO">자동</option>
                      </select>
                    </td>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                      발급 수량 <span className="text-red-500">*</span>
                    </th>
                    <td className="border border-gray-200 px-3 py-1">
                      <input
                        type="number"
                        value={issueQty}
                        onChange={(e) => setIssueQty(Number(e.target.value))}
                        min={1}
                        max={100}
                        disabled={!selectedCoupon}
                        className="w-32 border rounded px-2 py-1 disabled:bg-gray-100"
                      />
                      <span className="text-xs text-gray-400 ml-2">최대 100건</span>
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                      유효기간 <span className="text-red-500">*</span>
                    </th>
                    <td className="border border-gray-200 px-3 py-1" colSpan={3}>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={validStartDate}
                          onChange={(e) => setValidStartDate(e.target.value)}
                          disabled={!selectedCoupon}
                          className="border rounded px-2 py-1 disabled:bg-gray-100"
                        />
                        <span className="text-gray-400">~</span>
                        <input
                          type="date"
                          value={validEndDate}
                          onChange={(e) => setValidEndDate(e.target.value)}
                          disabled={!selectedCoupon}
                          className="border rounded px-2 py-1 disabled:bg-gray-100"
                        />
                        <span className="text-xs text-gray-400 ml-2">마스터 기간과 별도 설정 가능</span>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                      메모
                    </th>
                    <td className="border border-gray-200 px-3 py-1" colSpan={3}>
                      <input
                        type="text"
                        value={memo}
                        onChange={(e) => setMemo(e.target.value)}
                        placeholder="발급 사유"
                        disabled={!selectedCoupon}
                        className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 발급 결과 그리드 */}
              {issuedGridData.length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-green-800">
                      발급 완료 ({issuedGridData.length}건)
                    </span>
                    <button
                      onClick={() => setIssuedResult([])}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      닫기
                    </button>
                  </div>
                  <SimpleTabulator
                    columns={issuedColumns}
                    data={issuedGridData}
                    height={200}
                    placeholder=""
                  />
                </div>
              )}
            </div>
          ) : (
            /* 발급 이력 탭 */
            <div className="p-4">
              {selectedCoupon ? (
                <>
                  <p className="text-sm text-gray-500 mb-3">
                    [{selectedCoupon.name}]의 발급 이력
                  </p>
                  <SimpleTabulator
                    columns={historyColumns}
                    data={historyGridData}
                    height={350}
                    placeholder="이 쿠폰의 발급 이력이 없습니다."
                  />
                </>
              ) : (
                <div className="py-12 text-center text-gray-400 text-sm">
                  좌측 목록에서 쿠폰을 선택하세요.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
