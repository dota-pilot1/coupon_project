'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

type CouponApproval = {
  id: string
  name: string
  discountType: string
  discountValue: number
  apprvCd: string
  apprvDt: string | null
  useYn: string
  createdAt: string
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  C: { label: '생성', color: 'bg-gray-200 text-gray-700' },
  W: { label: '승인요청', color: 'bg-yellow-100 text-yellow-800' },
  Y: { label: '승인', color: 'bg-green-100 text-green-800' },
  R: { label: '반려', color: 'bg-red-100 text-red-800' },
  T: { label: '강제중지', color: 'bg-gray-500 text-white' },
}

// 상태별 가능한 액션 버튼
const ACTION_BUTTONS: Record<string, Array<{ newStatus: string; label: string; className: string }>> = {
  C: [{ newStatus: 'W', label: '승인요청', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' }],
  W: [
    { newStatus: 'Y', label: '승인', className: 'bg-green-600 hover:bg-green-700 text-white' },
    { newStatus: 'R', label: '반려', className: 'bg-red-500 hover:bg-red-600 text-white' },
  ],
  Y: [{ newStatus: 'T', label: '강제중지', className: 'bg-gray-600 hover:bg-gray-700 text-white' }],
  R: [{ newStatus: 'W', label: '재승인요청', className: 'bg-yellow-500 hover:bg-yellow-600 text-white' }],
  T: [],
}

export default function ApprovalPage() {
  const queryClient = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('ALL')

  const { data: coupons = [] } = useQuery<CouponApproval[]>({
    queryKey: ['approvalList'],
    queryFn: () => fetch('/api/approval').then((r) => r.json()),
  })

  const statusMutation = useMutation({
    mutationFn: ({ couponId, newStatus }: { couponId: string; newStatus: string }) =>
      fetch(`/api/approval/${couponId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus }),
      }).then(async (r) => {
        const data = await r.json()
        if (!r.ok) throw new Error(data.error)
        return data
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['approvalList'] })
    },
    onError: (err: Error) => {
      alert(err.message)
    },
  })

  const filtered = filterStatus === 'ALL'
    ? coupons
    : coupons.filter((c) => c.apprvCd === filterStatus)

  const selected = coupons.find((c) => c.id === selectedId)

  const handleStatusChange = (couponId: string, newStatus: string) => {
    const statusLabel = STATUS_LABELS[newStatus]?.label || newStatus
    if (!confirm(`'${statusLabel}'(으)로 변경하시겠습니까?`)) return
    statusMutation.mutate({ couponId, newStatus })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-xl font-bold mb-4">승인 관리</h1>

      <div className="flex gap-4">
        {/* 좌측: 목록 */}
        <div className="w-[35%] min-w-[280px] bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">쿠폰 목록 ({filtered.length}건)</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded px-2 py-0.5 text-xs"
            >
              <option value="ALL">전체</option>
              <option value="C">생성</option>
              <option value="W">승인요청</option>
              <option value="Y">승인</option>
              <option value="R">반려</option>
              <option value="T">강제중지</option>
            </select>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {filtered.map((c) => {
              const status = STATUS_LABELS[c.apprvCd] || { label: c.apprvCd, color: 'bg-gray-200' }
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`p-3 border-b cursor-pointer hover:bg-blue-50 text-sm ${
                    selectedId === c.id ? 'bg-blue-100' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{c.name}</span>
                    <span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {c.discountType === 'RATE'
                      ? `${c.discountValue}% 할인`
                      : `${c.discountValue.toLocaleString()}원 할인`}
                  </div>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">
                해당 상태의 쿠폰이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 우측: 상세 + 승인 액션 */}
        <div className="flex-1 bg-white rounded border">
          <div className="p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">승인 상세</span>
          </div>

          {selected ? (
            <div className="p-4">
              <table className="w-full border-collapse text-sm mb-6">
                <tbody>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                      쿠폰ID
                    </th>
                    <td className="border border-gray-200 px-3 py-2">{selected.id}</td>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                      쿠폰명
                    </th>
                    <td className="border border-gray-200 px-3 py-2">{selected.name}</td>
                  </tr>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                      할인유형
                    </th>
                    <td className="border border-gray-200 px-3 py-2">
                      {selected.discountType === 'RATE' ? '정률(%)' : '정액(원)'}
                    </td>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                      할인값
                    </th>
                    <td className="border border-gray-200 px-3 py-2">
                      {selected.discountType === 'RATE'
                        ? `${selected.discountValue}%`
                        : `${selected.discountValue.toLocaleString()}원`}
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                      현재 상태
                    </th>
                    <td className="border border-gray-200 px-3 py-2">
                      <span className={`px-2 py-1 rounded text-xs ${STATUS_LABELS[selected.apprvCd]?.color || ''}`}>
                        {STATUS_LABELS[selected.apprvCd]?.label || selected.apprvCd}
                      </span>
                    </td>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                      승인일시
                    </th>
                    <td className="border border-gray-200 px-3 py-2 text-gray-500">
                      {selected.apprvDt || '-'}
                    </td>
                  </tr>
                  <tr>
                    <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                      생성일
                    </th>
                    <td colSpan={3} className="border border-gray-200 px-3 py-2 text-gray-500">
                      {selected.createdAt}
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 상태 전이 흐름도 */}
              <div className="border rounded p-4 mb-4 bg-gray-50">
                <span className="text-sm font-medium block mb-3">상태 흐름</span>
                <div className="flex items-center gap-2 text-xs flex-wrap">
                  {['C', 'W', 'Y', 'R', 'T'].map((code) => {
                    const s = STATUS_LABELS[code]
                    const isCurrent = selected.apprvCd === code
                    return (
                      <span key={code}>
                        <span
                          className={`inline-block px-3 py-1.5 rounded ${
                            isCurrent
                              ? `${s.color} ring-2 ring-blue-500 font-bold`
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {s.label}
                        </span>
                        {code !== 'T' && <span className="mx-1 text-gray-300">→</span>}
                      </span>
                    )
                  })}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  C(생성) → W(승인요청) → Y(승인) or R(반려), Y → T(강제중지), R → W(재승인요청)
                </p>
              </div>

              {/* 액션 버튼 */}
              {(ACTION_BUTTONS[selected.apprvCd] || []).length > 0 && (
                <div className="flex gap-2">
                  {ACTION_BUTTONS[selected.apprvCd].map((action) => (
                    <button
                      key={action.newStatus}
                      onClick={() => handleStatusChange(selected.id, action.newStatus)}
                      disabled={statusMutation.isPending}
                      className={`px-4 py-2 rounded text-sm font-medium ${action.className} disabled:opacity-50`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}

              {(ACTION_BUTTONS[selected.apprvCd] || []).length === 0 && (
                <p className="text-sm text-gray-400">
                  현재 상태에서 가능한 액션이 없습니다.
                </p>
              )}
            </div>
          ) : (
            <div className="p-6 text-center text-gray-400 text-sm">
              좌측에서 쿠폰을 선택하세요.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
