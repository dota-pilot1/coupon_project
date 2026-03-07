'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type Coupon = {
  id: string
  name: string
  discountType: string
  discountValue: number
  apprvCd: string
}

type IssuanceRecord = {
  id: string
  couponId: string
  couponName: string
  issueQty: number
  issueDt: string
  memo: string | null
  createdAt: string
}

type IssuedCoupon = {
  id: string
  status: string
}

export default function IssuancePage() {
  const queryClient = useQueryClient()
  const [selectedCouponId, setSelectedCouponId] = useState('')
  const [issueQty, setIssueQty] = useState(1)
  const [memo, setMemo] = useState('')
  const [issuedResult, setIssuedResult] = useState<IssuedCoupon[]>([])

  // 승인 완료된 쿠폰 목록 (발급 가능한 쿠폰)
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
    mutationFn: (data: { couponId: string; issueQty: number; memo: string }) =>
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
    },
    onError: (err: Error) => {
      alert(err.message)
    },
  })

  const handleIssue = () => {
    if (!selectedCouponId) {
      alert('발급할 쿠폰을 선택하세요.')
      return
    }
    if (issueQty < 1 || issueQty > 100) {
      alert('발급 수량은 1~100 사이로 입력하세요.')
      return
    }
    if (!confirm(`${issueQty}건의 쿠폰을 발급하시겠습니까?`)) return
    issueMutation.mutate({ couponId: selectedCouponId, issueQty, memo })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-xl font-bold mb-4">쿠폰 발급</h1>

      <div className="flex gap-4">
        {/* 좌측: 발급 이력 */}
        <div className="w-[35%] min-w-[280px] bg-white rounded border">
          <div className="p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">발급 이력 ({issuances.length}건)</span>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {issuances.map((iss) => (
              <div key={iss.id} className="p-3 border-b text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{iss.couponName}</span>
                  <span className="text-xs text-blue-600 font-mono">{iss.issueQty}건</span>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  {iss.issueDt} | {iss.id}
                </div>
                {iss.memo && (
                  <div className="text-gray-400 text-xs mt-0.5">{iss.memo}</div>
                )}
              </div>
            ))}
            {issuances.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">
                발급 이력이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 우측: 발급 폼 + 결과 */}
        <div className="flex-1 bg-white rounded border">
          <div className="p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">쿠폰 발급</span>
          </div>

          <div className="p-4">
            <table className="w-full border-collapse text-sm mb-4">
              <tbody>
                <tr>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                    대상 쿠폰 <span className="text-red-500">*</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 px-3 py-1">
                    <select
                      value={selectedCouponId}
                      onChange={(e) => setSelectedCouponId(e.target.value)}
                      className="w-full border rounded px-2 py-1"
                    >
                      <option value="">-- 쿠폰 선택 --</option>
                      {coupons.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.discountType === 'RATE' ? `${c.discountValue}%` : `${c.discountValue}원`})
                        </option>
                      ))}
                    </select>
                    {coupons.length === 0 && (
                      <p className="text-xs text-gray-400 mt-1">
                        승인 완료(Y)된 쿠폰이 없습니다. 승인 관리에서 먼저 승인 처리하세요.
                      </p>
                    )}
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                    발급 수량 <span className="text-red-500">*</span>
                  </th>
                  <td className="border border-gray-200 px-3 py-1">
                    <input
                      type="number"
                      value={issueQty}
                      onChange={(e) => setIssueQty(Number(e.target.value))}
                      min={1}
                      max={100}
                      className="w-32 border rounded px-2 py-1"
                    />
                    <span className="text-xs text-gray-400 ml-2">최대 100건</span>
                  </td>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                    메모
                  </th>
                  <td className="border border-gray-200 px-3 py-1">
                    <input
                      type="text"
                      value={memo}
                      onChange={(e) => setMemo(e.target.value)}
                      placeholder="발급 사유"
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-end mb-4">
              <button
                onClick={handleIssue}
                disabled={issueMutation.isPending}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
              >
                {issueMutation.isPending ? '발급중...' : '발급 실행'}
              </button>
            </div>

            {/* 발급 결과 */}
            {issuedResult.length > 0 && (
              <div className="border rounded">
                <div className="flex items-center justify-between p-2 border-b bg-green-50">
                  <span className="text-sm font-medium text-green-800">
                    발급 완료 ({issuedResult.length}건)
                  </span>
                  <button
                    onClick={() => setIssuedResult([])}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    닫기
                  </button>
                </div>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-2 py-1 w-10">No</th>
                      <th className="border border-gray-200 px-2 py-1">쿠폰번호</th>
                      <th className="border border-gray-200 px-2 py-1 w-24">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {issuedResult.map((c, i) => (
                      <tr key={c.id}>
                        <td className="border border-gray-200 px-2 py-1 text-center text-gray-500">
                          {i + 1}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 font-mono text-xs">
                          {c.id}
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-center">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                            {c.status === 'UNUSED' ? '미사용' : c.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
