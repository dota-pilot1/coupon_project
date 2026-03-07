'use client'

import { useState } from 'react'

type TimeSlot = {
  startTm: string
  endTm: string
}

type Props = {
  startDate: string
  endDate: string
  onStartDateChange: (d: string) => void
  onEndDateChange: (d: string) => void
  termTypeCd: string
  onTermTypeChange: (cd: string) => void
  timeSlots: TimeSlot[]
  onTimeSlotsChange: (slots: TimeSlot[]) => void
  dayOfWeek: string
  onDayOfWeekChange: (dow: string) => void
}

const TERM_TYPE_OPTIONS = [
  { value: '00', label: '일자제어' },
  { value: '10', label: '시간대제어' },
  { value: '01', label: '요일제어' },
  { value: '11', label: '시간대+요일제어' },
]

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

export default function ValidityPeriodForm({
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  termTypeCd,
  onTermTypeChange,
  timeSlots,
  onTimeSlotsChange,
  dayOfWeek,
  onDayOfWeekChange,
}: Props) {
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())

  const showTimeSlots = termTypeCd === '10' || termTypeCd === '11'
  const showDayOfWeek = termTypeCd === '01' || termTypeCd === '11'

  const handleAddTimeSlot = () => {
    onTimeSlotsChange([...timeSlots, { startTm: '', endTm: '' }])
  }

  const handleRemoveSelected = () => {
    const newSlots = timeSlots.filter((_, i) => !selectedRows.has(i))
    onTimeSlotsChange(newSlots)
    setSelectedRows(new Set())
  }

  const handleTimeChange = (index: number, field: 'startTm' | 'endTm', value: string) => {
    const newSlots = [...timeSlots]
    newSlots[index] = { ...newSlots[index], [field]: value }
    onTimeSlotsChange(newSlots)
  }

  const toggleRow = (index: number) => {
    const next = new Set(selectedRows)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    setSelectedRows(next)
  }

  const toggleAllRows = () => {
    if (selectedRows.size === timeSlots.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(timeSlots.map((_, i) => i)))
    }
  }

  const toggleDay = (dayIndex: number) => {
    const arr = dayOfWeek.split('')
    arr[dayIndex] = arr[dayIndex] === '1' ? '0' : '1'
    onDayOfWeekChange(arr.join(''))
  }

  const handleTermTypeChange = (newCd: string) => {
    // 타입 변경 시 관련 데이터 초기화
    if (newCd === '00') {
      onTimeSlotsChange([])
      onDayOfWeekChange('0000000')
    } else if (newCd === '10') {
      onDayOfWeekChange('0000000')
    } else if (newCd === '01') {
      onTimeSlotsChange([])
    }
    setSelectedRows(new Set())
    onTermTypeChange(newCd)
  }

  return (
    <div className="space-y-4">
      {/* 유효 기간 시작/종료 */}
      <table className="w-full border-collapse text-sm">
        <tbody>
          <tr>
            <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
              시작일 <span className="text-red-500">*</span>
            </th>
            <td className="border border-gray-200 px-3 py-1">
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </td>
            <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
              종료일 <span className="text-red-500">*</span>
            </th>
            <td className="border border-gray-200 px-3 py-1">
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="border rounded px-2 py-1"
              />
            </td>
          </tr>
        </tbody>
      </table>

      {/* 기간 제어 타입 선택 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium whitespace-nowrap">기간제어 유형</span>
        <select
          value={termTypeCd}
          onChange={(e) => handleTermTypeChange(e.target.value)}
          className="border rounded px-2 py-1 text-sm"
        >
          {TERM_TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* 시간대 그리드 */}
      {showTimeSlots && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">시간대 조건</span>
            <div className="flex gap-1">
              <button
                onClick={handleAddTimeSlot}
                className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                추가
              </button>
              {selectedRows.size > 0 && (
                <button
                  onClick={handleRemoveSelected}
                  className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  삭제 ({selectedRows.size})
                </button>
              )}
            </div>
          </div>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-50">
                <th className="border border-gray-200 px-2 py-1 w-8">
                  <input
                    type="checkbox"
                    checked={timeSlots.length > 0 && selectedRows.size === timeSlots.length}
                    onChange={toggleAllRows}
                  />
                </th>
                <th className="border border-gray-200 px-2 py-1 w-10">No</th>
                <th className="border border-gray-200 px-2 py-1">시작시간</th>
                <th className="border border-gray-200 px-2 py-1">종료시간</th>
              </tr>
            </thead>
            <tbody>
              {timeSlots.length === 0 ? (
                <tr>
                  <td colSpan={4} className="border border-gray-200 px-3 py-4 text-center text-gray-400 text-xs">
                    [추가] 버튼으로 시간대를 등록하세요.
                  </td>
                </tr>
              ) : (
                timeSlots.map((slot, i) => (
                  <tr key={i} className={selectedRows.has(i) ? 'bg-blue-50' : ''}>
                    <td className="border border-gray-200 px-2 py-1 text-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(i)}
                        onChange={() => toggleRow(i)}
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1 text-center text-gray-500">
                      {i + 1}
                    </td>
                    <td className="border border-gray-200 px-2 py-1">
                      <input
                        type="time"
                        value={slot.startTm}
                        onChange={(e) => handleTimeChange(i, 'startTm', e.target.value)}
                        className="w-full border rounded px-2 py-0.5"
                      />
                    </td>
                    <td className="border border-gray-200 px-2 py-1">
                      <input
                        type="time"
                        value={slot.endTm}
                        onChange={(e) => handleTimeChange(i, 'endTm', e.target.value)}
                        className="w-full border rounded px-2 py-0.5"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* 요일 선택 */}
      {showDayOfWeek && (
        <div>
          <span className="text-sm font-medium block mb-2">요일 조건</span>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => {
              const isActive = dayOfWeek[i] === '1'
              const isWeekend = i >= 5
              return (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-10 h-10 rounded text-sm font-medium transition-colors ${
                    isActive
                      ? isWeekend
                        ? 'bg-red-500 text-white'
                        : 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1">
            현재: {dayOfWeek} ({DAY_LABELS.filter((_, i) => dayOfWeek[i] === '1').join(', ') || '없음'})
          </p>
        </div>
      )}

      {termTypeCd === '00' && (
        <p className="text-sm text-gray-400">일자제어: 시작일~종료일 기준으로만 유효합니다.</p>
      )}
    </div>
  )
}
