'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import ShopTabs from '@/components/ShopTabs'
import ValidityPeriodForm from '@/components/ValidityPeriodForm'
import { useConfirmDialog } from '@/components/ConfirmDialog'

type Coupon = {
  id: string
  name: string
  discountType: string
  discountValue: number
  useYn: string
}

export default function Home() {
  const queryClient = useQueryClient()
  const { alert } = useConfirmDialog()
  const [selectedCoupon, setSelectedCoupon] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    discountType: 'RATE',
    discountValue: 0,
    termTypeCd: '00',
    startDate: '',
    endDate: '',
  })
  const [timeSlots, setTimeSlots] = useState<Array<{ startTm: string; endTm: string }>>([])
  const [dayOfWeek, setDayOfWeek] = useState('0000000')
  const [conditions, setConditions] = useState<
    Array<{
      shopId: string
      shopName: string
      sites: Array<{ id: string; name: string }>
      corners: Array<{ id: string; name: string; siteId: string }>
      menus: Array<{ id: string; name: string; siteId: string; cornerId: string }>
    }>
  >([])
  const [saveLog, setSaveLog] = useState<
    Array<{ table: string; data: Record<string, string> }>
  >([])

  const { data: coupons = [] } = useQuery<Coupon[]>({
    queryKey: ['coupons'],
    queryFn: () => fetch('/api/coupons').then((r) => r.json()),
  })

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch('/api/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['coupons'] })
      setSaveLog(result.insertLog || [])
    },
  })

  const handleSelectCoupon = async (couponId: string) => {
    setSelectedCoupon(couponId)
    const res = await fetch(`/api/coupons/${couponId}`)
    const data = await res.json()
    setFormData({
      id: data.id,
      name: data.name,
      description: data.description || '',
      discountType: data.discountType,
      discountValue: data.discountValue,
      termTypeCd: data.termTypeCd || '00',
      startDate: data.startDate || '',
      endDate: data.endDate || '',
    })
    setTimeSlots(data.timeSlots || [])
    setDayOfWeek(data.dayOfWeek || '0000000')
    setConditions(data.conditions || [])
  }

  const handleNew = () => {
    setSelectedCoupon(null)
    setFormData({
      id: '',
      name: '',
      description: '',
      discountType: 'RATE',
      discountValue: 0,
      termTypeCd: '00',
      startDate: '',
      endDate: '',
    })
    setTimeSlots([])
    setDayOfWeek('0000000')
    setConditions([])
  }

  const handleSave = () => {
    if (!formData.name) {
      alert('쿠폰명을 입력하세요.', '입력 오류')
      return
    }
    saveMutation.mutate({
      ...formData,
      timeSlots,
      dayOfWeek,
      conditions,
    })
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-xl font-bold mb-4">쿠폰 마스터 관리</h1>

      <div className="flex gap-4">
        {/* 좌측: 쿠폰 목록 (35%) */}
        <div className="w-[35%] min-w-[280px] bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">
              쿠폰 목록 ({coupons.length}건)
            </span>
            <button
              onClick={handleNew}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              신규
            </button>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {coupons.map((c) => (
              <div
                key={c.id}
                onClick={() => handleSelectCoupon(c.id)}
                className={`p-3 border-b cursor-pointer hover:bg-blue-50 text-sm ${
                  selectedCoupon === c.id ? 'bg-blue-100' : ''
                }`}
              >
                <div className="font-medium">{c.name}</div>
                <div className="text-gray-500 text-xs mt-1">
                  {c.discountType === 'RATE'
                    ? `${c.discountValue}% 할인`
                    : `${c.discountValue.toLocaleString()}원 할인`}
                </div>
              </div>
            ))}
            {coupons.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">
                등록된 쿠폰이 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 우측: 상세 */}
        <div className="flex-1 bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">쿠폰 상세정보</span>
            <button
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              {saveMutation.isPending ? '저장중...' : '저장'}
            </button>
          </div>

          <div className="p-4">
            {/* 기초 정보 */}
            <table className="w-full border-collapse text-sm mb-6">
              <tbody>
                <tr>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                    쿠폰명 <span className="text-red-500">*</span>
                  </th>
                  <td colSpan={3} className="border border-gray-200 px-3 py-1">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                    설명
                  </th>
                  <td colSpan={3} className="border border-gray-200 px-3 py-1">
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                    할인유형
                  </th>
                  <td className="border border-gray-200 px-3 py-1">
                    <select
                      value={formData.discountType}
                      onChange={(e) =>
                        setFormData({ ...formData, discountType: e.target.value })
                      }
                      className="border rounded px-2 py-1"
                    >
                      <option value="RATE">정률 (%)</option>
                      <option value="AMOUNT">정액 (원)</option>
                    </select>
                  </td>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                    할인값
                  </th>
                  <td className="border border-gray-200 px-3 py-1">
                    <input
                      type="number"
                      value={formData.discountValue}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discountValue: Number(e.target.value),
                        })
                      }
                      className="w-32 border rounded px-2 py-1"
                    />
                  </td>
                </tr>
              </tbody>
            </table>

            {/* 사용제한 - 방안 A-2: 점포별 탭 */}
            <div className="border rounded">
              <div className="p-3 border-b bg-gray-50">
                <span className="font-medium text-sm">사용 대상 제한</span>
                <p className="text-xs text-green-700 mt-1">
                  점포별 탭으로 사이트/코너/메뉴 조건을 관리합니다.
                </p>
              </div>
              <div className="p-4">
                <ShopTabs conditions={conditions} onChange={setConditions} />
              </div>
            </div>

            {/* 유효 기간 제어 */}
            <div className="border rounded mt-4">
              <div className="p-3 border-b bg-gray-50">
                <span className="font-medium text-sm">유효 기간 제어</span>
              </div>
              <div className="p-4">
                <ValidityPeriodForm
                  startDate={formData.startDate}
                  endDate={formData.endDate}
                  onStartDateChange={(d) => setFormData({ ...formData, startDate: d })}
                  onEndDateChange={(d) => setFormData({ ...formData, endDate: d })}
                  termTypeCd={formData.termTypeCd}
                  onTermTypeChange={(cd) => setFormData({ ...formData, termTypeCd: cd })}
                  timeSlots={timeSlots}
                  onTimeSlotsChange={setTimeSlots}
                  dayOfWeek={dayOfWeek}
                  onDayOfWeekChange={setDayOfWeek}
                />
              </div>
            </div>

            {/* 저장 로그 (JSON) */}
            {saveLog.length > 0 && (
              <div className="mt-4 border rounded">
                <div className="flex items-center justify-between p-2 border-b bg-gray-800 text-white rounded-t">
                  <span className="text-xs font-mono">DB INSERT 로그 ({saveLog.length}건)</span>
                  <button
                    onClick={() => setSaveLog([])}
                    className="text-xs text-gray-400 hover:text-white"
                  >
                    닫기
                  </button>
                </div>
                <pre className="bg-gray-900 text-green-400 p-3 rounded-b max-h-[300px] overflow-y-auto font-mono text-xs whitespace-pre">
{JSON.stringify(
  Object.entries(
    saveLog.reduce((acc, log) => {
      if (!acc[log.table]) acc[log.table] = []
      acc[log.table].push(log.data)
      return acc
    }, {} as Record<string, Record<string, string>[]>)
  ).reduce((obj, [k, v]) => ({ ...obj, [k]: v }), {}),
  null,
  2
)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
