'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useConfirmDialog } from '@/components/ConfirmDialog'

type CodeGroup = {
  groupCd: string
  groupNm: string
  description: string | null
  useYn: string
  createdAt: string
  updatedAt: string
}

type CodeDetailRow = {
  id?: number
  detailCd: string
  detailNm: string
  sortOrder: number
  useYn: string
}

export default function CommonCodePage() {
  const queryClient = useQueryClient()
  const { confirm, alert } = useConfirmDialog()
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [groupForm, setGroupForm] = useState({
    groupCd: '',
    groupNm: '',
    description: '',
    useYn: 'Y',
  })
  const [details, setDetails] = useState<CodeDetailRow[]>([])
  const [selectedDetailRows, setSelectedDetailRows] = useState<Set<number>>(new Set())
  const [isNewGroup, setIsNewGroup] = useState(false)

  // 그룹 목록 조회
  const { data: groups = [] } = useQuery<CodeGroup[]>({
    queryKey: ['codeGroups'],
    queryFn: () => fetch('/api/common-codes').then((r) => r.json()),
  })

  // 상세코드 조회
  const { data: detailData } = useQuery<CodeDetailRow[]>({
    queryKey: ['codeDetails', selectedGroup],
    queryFn: () =>
      fetch(`/api/common-codes/${selectedGroup}/details`).then((r) => r.json()),
    enabled: !!selectedGroup,
  })

  // 그룹 저장
  const groupSaveMutation = useMutation({
    mutationFn: (data: Record<string, string>) =>
      fetch('/api/common-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codeGroups'] })
      setIsNewGroup(false)
    },
  })

  // 그룹 삭제
  const groupDeleteMutation = useMutation({
    mutationFn: (groupCd: string) =>
      fetch('/api/common-codes', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupCd }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codeGroups'] })
      handleNewGroup()
    },
  })

  // 상세코드 일괄 저장
  const detailSaveMutation = useMutation({
    mutationFn: (data: { groupCd: string; details: CodeDetailRow[] }) =>
      fetch(`/api/common-codes/${data.groupCd}/details`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ details: data.details }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['codeDetails', selectedGroup] })
    },
  })

  const handleSelectGroup = (group: CodeGroup) => {
    setSelectedGroup(group.groupCd)
    setGroupForm({
      groupCd: group.groupCd,
      groupNm: group.groupNm,
      description: group.description || '',
      useYn: group.useYn,
    })
    setIsNewGroup(false)
    setSelectedDetailRows(new Set())
  }

  // detailData 변경 시 로컬 상태 동기화
  const currentDetails = detailData || []
  if (
    selectedGroup &&
    detailData &&
    JSON.stringify(currentDetails) !== JSON.stringify(details) &&
    !detailSaveMutation.isPending
  ) {
    setDetails(currentDetails)
  }

  const handleNewGroup = () => {
    setSelectedGroup(null)
    setGroupForm({ groupCd: '', groupNm: '', description: '', useYn: 'Y' })
    setDetails([])
    setIsNewGroup(true)
    setSelectedDetailRows(new Set())
  }

  const handleSaveGroup = async () => {
    if (!groupForm.groupCd || !groupForm.groupNm) {
      await alert('그룹코드와 그룹명은 필수입니다.', '입력 오류')
      return
    }
    groupSaveMutation.mutate(groupForm)
  }

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return
    const ok = await confirm({
      title: '그룹 삭제',
      description: `'${selectedGroup}' 그룹을 삭제하시겠습니까?\n하위 상세코드도 함께 삭제됩니다.`,
      confirmText: '삭제',
    })
    if (!ok) return
    groupDeleteMutation.mutate(selectedGroup)
  }

  // 상세코드 행 추가
  const handleAddDetail = () => {
    setDetails([...details, { detailCd: '', detailNm: '', sortOrder: details.length + 1, useYn: 'Y' }])
  }

  // 상세코드 선택 행 삭제
  const handleRemoveSelectedDetails = () => {
    setDetails(details.filter((_, i) => !selectedDetailRows.has(i)))
    setSelectedDetailRows(new Set())
  }

  // 상세코드 일괄 저장
  const handleSaveDetails = async () => {
    if (!selectedGroup) {
      await alert('그룹을 먼저 선택/저장하세요.', '안내')
      return
    }
    const invalid = details.find((d) => !d.detailCd || !d.detailNm)
    if (invalid) {
      await alert('상세코드와 상세명은 필수입니다.', '입력 오류')
      return
    }
    detailSaveMutation.mutate({ groupCd: selectedGroup, details })
  }

  const handleDetailChange = (index: number, field: keyof CodeDetailRow, value: string | number) => {
    const next = [...details]
    next[index] = { ...next[index], [field]: value }
    setDetails(next)
  }

  const toggleDetailRow = (i: number) => {
    const next = new Set(selectedDetailRows)
    if (next.has(i)) next.delete(i)
    else next.add(i)
    setSelectedDetailRows(next)
  }

  const toggleAllDetailRows = () => {
    if (selectedDetailRows.size === details.length) {
      setSelectedDetailRows(new Set())
    } else {
      setSelectedDetailRows(new Set(details.map((_, i) => i)))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <h1 className="text-xl font-bold mb-4">공통코드 관리</h1>

      <div className="flex gap-4">
        {/* 좌측: 그룹코드 목록 */}
        <div className="w-[35%] min-w-[280px] bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">그룹코드 목록 ({groups.length}건)</span>
            <button
              onClick={handleNewGroup}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              신규
            </button>
          </div>
          <div className="max-h-[600px] overflow-y-auto">
            {groups.map((g) => (
              <div
                key={g.groupCd}
                onClick={() => handleSelectGroup(g)}
                className={`p-3 border-b cursor-pointer hover:bg-blue-50 text-sm ${
                  selectedGroup === g.groupCd ? 'bg-blue-100' : ''
                }`}
              >
                <div className="font-medium">{g.groupCd}</div>
                <div className="text-gray-500 text-xs mt-1">{g.groupNm}</div>
              </div>
            ))}
            {groups.length === 0 && (
              <div className="p-6 text-center text-gray-400 text-sm">
                등록된 그룹코드가 없습니다.
              </div>
            )}
          </div>
        </div>

        {/* 우측: 상세 */}
        <div className="flex-1 bg-white rounded border">
          {/* 그룹 상세 */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">그룹코드 상세</span>
            <div className="flex gap-1">
              {selectedGroup && (
                <button
                  onClick={handleDeleteGroup}
                  className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                >
                  삭제
                </button>
              )}
              <button
                onClick={handleSaveGroup}
                className="px-4 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                저장
              </button>
            </div>
          </div>

          <div className="p-4">
            <table className="w-full border-collapse text-sm mb-6">
              <tbody>
                <tr>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                    그룹코드 <span className="text-red-500">*</span>
                  </th>
                  <td className="border border-gray-200 px-3 py-1">
                    <input
                      type="text"
                      value={groupForm.groupCd}
                      onChange={(e) =>
                        setGroupForm({ ...groupForm, groupCd: e.target.value.toUpperCase() })
                      }
                      disabled={!isNewGroup && !!selectedGroup}
                      className="w-full border rounded px-2 py-1 disabled:bg-gray-100"
                    />
                  </td>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal w-28 whitespace-nowrap">
                    그룹명 <span className="text-red-500">*</span>
                  </th>
                  <td className="border border-gray-200 px-3 py-1">
                    <input
                      type="text"
                      value={groupForm.groupNm}
                      onChange={(e) =>
                        setGroupForm({ ...groupForm, groupNm: e.target.value })
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                    설명
                  </th>
                  <td colSpan={2} className="border border-gray-200 px-3 py-1">
                    <input
                      type="text"
                      value={groupForm.description}
                      onChange={(e) =>
                        setGroupForm({ ...groupForm, description: e.target.value })
                      }
                      className="w-full border rounded px-2 py-1"
                    />
                  </td>
                  <th className="bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal whitespace-nowrap">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupForm.useYn === 'Y'}
                        onChange={(e) =>
                          setGroupForm({ ...groupForm, useYn: e.target.checked ? 'Y' : 'N' })
                        }
                      />
                      사용여부
                    </label>
                  </th>
                </tr>
              </tbody>
            </table>

            {/* 상세코드 그리드 */}
            <div className="border rounded">
              <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                <span className="font-medium text-sm">
                  상세코드 목록 ({details.length}건)
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={handleAddDetail}
                    className="px-2 py-0.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    추가
                  </button>
                  {selectedDetailRows.size > 0 && (
                    <button
                      onClick={handleRemoveSelectedDetails}
                      className="px-2 py-0.5 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      삭제 ({selectedDetailRows.size})
                    </button>
                  )}
                  <button
                    onClick={handleSaveDetails}
                    disabled={detailSaveMutation.isPending}
                    className="px-3 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
                  >
                    {detailSaveMutation.isPending ? '저장중...' : '일괄저장'}
                  </button>
                </div>
              </div>

              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-2 py-1 w-8">
                      <input
                        type="checkbox"
                        checked={details.length > 0 && selectedDetailRows.size === details.length}
                        onChange={toggleAllDetailRows}
                      />
                    </th>
                    <th className="border border-gray-200 px-2 py-1 w-10">No</th>
                    <th className="border border-gray-200 px-2 py-1">상세코드</th>
                    <th className="border border-gray-200 px-2 py-1">상세명</th>
                    <th className="border border-gray-200 px-2 py-1 w-20">정렬순서</th>
                    <th className="border border-gray-200 px-2 py-1 w-20">사용</th>
                  </tr>
                </thead>
                <tbody>
                  {details.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="border border-gray-200 px-3 py-4 text-center text-gray-400 text-xs">
                        {selectedGroup
                          ? '[추가] 버튼으로 상세코드를 등록하세요.'
                          : '좌측에서 그룹코드를 선택하세요.'}
                      </td>
                    </tr>
                  ) : (
                    details.map((d, i) => (
                      <tr key={i} className={selectedDetailRows.has(i) ? 'bg-blue-50' : ''}>
                        <td className="border border-gray-200 px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={selectedDetailRows.has(i)}
                            onChange={() => toggleDetailRow(i)}
                          />
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-center text-gray-500">
                          {i + 1}
                        </td>
                        <td className="border border-gray-200 px-2 py-1">
                          <input
                            type="text"
                            value={d.detailCd}
                            onChange={(e) => handleDetailChange(i, 'detailCd', e.target.value)}
                            className="w-full border rounded px-2 py-0.5"
                          />
                        </td>
                        <td className="border border-gray-200 px-2 py-1">
                          <input
                            type="text"
                            value={d.detailNm}
                            onChange={(e) => handleDetailChange(i, 'detailNm', e.target.value)}
                            className="w-full border rounded px-2 py-0.5"
                          />
                        </td>
                        <td className="border border-gray-200 px-2 py-1">
                          <input
                            type="number"
                            value={d.sortOrder}
                            onChange={(e) => handleDetailChange(i, 'sortOrder', Number(e.target.value))}
                            className="w-full border rounded px-2 py-0.5 text-center"
                          />
                        </td>
                        <td className="border border-gray-200 px-2 py-1 text-center">
                          <input
                            type="checkbox"
                            checked={d.useYn === 'Y'}
                            onChange={(e) => handleDetailChange(i, 'useYn', e.target.checked ? 'Y' : 'N')}
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
