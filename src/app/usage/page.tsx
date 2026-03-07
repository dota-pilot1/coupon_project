'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

type Stats = {
  totalIssued: number
  usedCount: number
  unusedCount: number
  expiredCount: number
  usageRate: number
}

type CouponStat = {
  couponId: string
  couponName: string
  total: number
  used: number
  unused: number
  expired: number
}

type IssuedDetail = {
  id: string
  couponId: string
  couponName: string
  issuanceId: string
  status: string
  usedAt: string | null
  usedShopId: string | null
  usedAmount: number | null
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  UNUSED: { label: '미사용', color: 'bg-blue-100 text-blue-800' },
  USED: { label: '사용완료', color: 'bg-green-100 text-green-800' },
  EXPIRED: { label: '만료', color: 'bg-gray-200 text-gray-600' },
}

export default function UsagePage() {
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [filterCouponId, setFilterCouponId] = useState('ALL')

  const { data } = useQuery<{
    stats: Stats
    couponStats: CouponStat[]
    details: IssuedDetail[]
  }>({
    queryKey: ['usage'],
    queryFn: () => fetch('/api/usage').then((r) => r.json()),
  })

  const stats = data?.stats || { totalIssued: 0, usedCount: 0, unusedCount: 0, expiredCount: 0, usageRate: 0 }
  const couponStats = data?.couponStats || []
  const details = data?.details || []

  const filtered = details.filter((d) => {
    if (filterStatus !== 'ALL' && d.status !== filterStatus) return false
    if (filterCouponId !== 'ALL' && d.couponId !== filterCouponId) return false
    return true
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-xl font-bold mb-4">사용 현황</h1>

      {/* 통계 카드 */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatCard label="총 발급" value={stats.totalIssued} unit="건" color="bg-blue-500" />
        <StatCard label="사용완료" value={stats.usedCount} unit="건" color="bg-green-500" />
        <StatCard label="미사용" value={stats.unusedCount} unit="건" color="bg-yellow-500" />
        <StatCard label="만료" value={stats.expiredCount} unit="건" color="bg-gray-500" />
        <StatCard label="사용률" value={stats.usageRate} unit="%" color="bg-indigo-500" />
      </div>

      {/* 쿠폰별 집계 */}
      {couponStats.length > 0 && (
        <div className="bg-white rounded border mb-6">
          <div className="p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">쿠폰별 집계</span>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-3 py-2 text-left">쿠폰명</th>
                <th className="border border-gray-200 px-3 py-2 text-center w-20">총발급</th>
                <th className="border border-gray-200 px-3 py-2 text-center w-20">사용</th>
                <th className="border border-gray-200 px-3 py-2 text-center w-20">미사용</th>
                <th className="border border-gray-200 px-3 py-2 text-center w-20">만료</th>
                <th className="border border-gray-200 px-3 py-2 text-center w-24">사용률</th>
              </tr>
            </thead>
            <tbody>
              {couponStats.map((cs) => {
                const rate = cs.total > 0 ? Math.round(((cs.used || 0) / cs.total) * 100) : 0
                return (
                  <tr key={cs.couponId}>
                    <td className="border border-gray-200 px-3 py-2">{cs.couponName}</td>
                    <td className="border border-gray-200 px-3 py-2 text-center">{cs.total}</td>
                    <td className="border border-gray-200 px-3 py-2 text-center text-green-600">{cs.used || 0}</td>
                    <td className="border border-gray-200 px-3 py-2 text-center text-blue-600">{cs.unused || 0}</td>
                    <td className="border border-gray-200 px-3 py-2 text-center text-gray-500">{cs.expired || 0}</td>
                    <td className="border border-gray-200 px-3 py-2 text-center">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${rate}%` }}
                          />
                        </div>
                        <span className="text-xs">{rate}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 상세 목록 */}
      <div className="bg-white rounded border">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <span className="font-medium text-sm">발급 쿠폰 상세 ({filtered.length}건)</span>
          <div className="flex gap-2">
            <select
              value={filterCouponId}
              onChange={(e) => setFilterCouponId(e.target.value)}
              className="border rounded px-2 py-0.5 text-xs"
            >
              <option value="ALL">전체 쿠폰</option>
              {couponStats.map((cs) => (
                <option key={cs.couponId} value={cs.couponId}>
                  {cs.couponName}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded px-2 py-0.5 text-xs"
            >
              <option value="ALL">전체 상태</option>
              <option value="UNUSED">미사용</option>
              <option value="USED">사용완료</option>
              <option value="EXPIRED">만료</option>
            </select>
          </div>
        </div>
        <div className="max-h-[400px] overflow-y-auto">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0">
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-2 py-1 w-10">No</th>
                <th className="border border-gray-200 px-2 py-1">쿠폰번호</th>
                <th className="border border-gray-200 px-2 py-1">쿠폰명</th>
                <th className="border border-gray-200 px-2 py-1 w-24">상태</th>
                <th className="border border-gray-200 px-2 py-1">사용일시</th>
                <th className="border border-gray-200 px-2 py-1">사용점포</th>
                <th className="border border-gray-200 px-2 py-1 w-24">사용금액</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="border border-gray-200 px-3 py-6 text-center text-gray-400 text-xs">
                    {details.length === 0 ? '발급된 쿠폰이 없습니다.' : '해당 조건의 데이터가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filtered.map((d, i) => {
                  const status = STATUS_LABELS[d.status] || { label: d.status, color: '' }
                  return (
                    <tr key={d.id}>
                      <td className="border border-gray-200 px-2 py-1 text-center text-gray-500">
                        {i + 1}
                      </td>
                      <td className="border border-gray-200 px-2 py-1 font-mono text-xs">
                        {d.id}
                      </td>
                      <td className="border border-gray-200 px-2 py-1">{d.couponName}</td>
                      <td className="border border-gray-200 px-2 py-1 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-2 py-1 text-gray-500 text-xs">
                        {d.usedAt || '-'}
                      </td>
                      <td className="border border-gray-200 px-2 py-1 text-gray-500">
                        {d.usedShopId || '-'}
                      </td>
                      <td className="border border-gray-200 px-2 py-1 text-right text-gray-500">
                        {d.usedAmount ? `${d.usedAmount.toLocaleString()}원` : '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className="bg-white rounded border p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className="text-2xl font-bold">{value.toLocaleString()}</span>
        <span className="text-sm text-gray-400">{unit}</span>
      </div>
      <div className={`h-1 ${color} rounded mt-2`} />
    </div>
  )
}
