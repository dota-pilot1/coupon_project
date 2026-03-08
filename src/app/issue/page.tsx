'use client'

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'sonner'
import type { ColumnDefinition } from '@/components/SimpleTabulator'

const SimpleTabulator = dynamic(() => import('@/components/SimpleTabulator'), { ssr: false })

type Issue = {
  id: number
  category: string
  title: string
  content: string
  status: string
  priority: string
  author: string
  createdAt: string
  updatedAt: string
}

type ChecklistItem = {
  id: number
  issueId: number
  content: string
  checked: number
  createdAt: string
}

type IssueDetail = Issue & { checklist: ChecklistItem[] }

type BoardCategory = { id: number; code: string; name: string }

const STATUSES = [
  { value: 'ALL', label: '전체' },
  { value: 'OPEN', label: '미처리' },
  { value: 'IN_PROGRESS', label: '진행중' },
  { value: 'RESOLVED', label: '해결됨' },
  { value: 'CLOSED', label: '완료' },
]

const STATUS_LABELS: Record<string, string> = {
  OPEN: '미처리',
  IN_PROGRESS: '진행중',
  RESOLVED: '해결됨',
  CLOSED: '완료',
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-green-100 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
}

const PRIORITIES = [
  { value: 'ALL', label: '전체' },
  { value: 'CRITICAL', label: '긴급' },
  { value: 'HIGH', label: '높음' },
  { value: 'MEDIUM', label: '보통' },
  { value: 'LOW', label: '낮음' },
]

const PRIORITY_LABELS: Record<string, string> = {
  CRITICAL: '긴급',
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
}

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-200 text-red-800',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-yellow-100 text-yellow-700',
  LOW: 'bg-gray-100 text-gray-600',
}

const columns: ColumnDefinition[] = [
  { title: 'No.', field: 'rn', width: 50, hozAlign: 'center', headerSort: false },
  { title: '카테고리', field: 'categoryLabel', width: 90, hozAlign: 'center' },
  { title: '제목', field: 'title', minWidth: 120, hozAlign: 'left' },
  { title: '상태', field: 'statusLabel', width: 75, hozAlign: 'center' },
  { title: '우선순위', field: 'priorityLabel', width: 75, hozAlign: 'center' },
  { title: '작성일', field: 'dateDisplay', width: 90, hozAlign: 'center' },
]

export default function IssuePage() {
  const queryClient = useQueryClient()
  const { confirm, alert } = useConfirmDialog()

  const [filterCategory, setFilterCategory] = useState('ALL')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [searchKeyword, setSearchKeyword] = useState('')

  // 카테고리 목록
  const { data: categoryList = [] } = useQuery<BoardCategory[]>({
    queryKey: ['boardCategories'],
    queryFn: () => fetch('/api/board-categories').then((r) => r.json()),
  })
  const categoryMap = useMemo(() => Object.fromEntries(categoryList.map((c) => [c.code, c.name])), [categoryList])
  const CATEGORIES = useMemo(() => [{ value: 'ALL', label: '전체' }, ...categoryList.map((c) => ({ value: c.code, label: c.name }))], [categoryList])

  const [selectedIssueId, setSelectedIssueId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formCategory, setFormCategory] = useState('COMMON')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formStatus, setFormStatus] = useState('OPEN')
  const [formPriority, setFormPriority] = useState('MEDIUM')
  const [checkInput, setCheckInput] = useState('')
  const checkInputRef = useRef<HTMLInputElement>(null)

  // 이슈 목록
  const { data: issues = [] } = useQuery<Issue[]>({
    queryKey: ['issues', filterCategory, filterStatus, searchKeyword],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterCategory !== 'ALL') params.set('category', filterCategory)
      if (filterStatus !== 'ALL') params.set('status', filterStatus)
      if (searchKeyword) params.set('keyword', searchKeyword)
      return fetch(`/api/issues?${params}`).then((r) => r.json())
    },
  })

  // 이슈 상세
  const { data: issueDetail } = useQuery<IssueDetail>({
    queryKey: ['issue', selectedIssueId],
    queryFn: () => fetch(`/api/issues/${selectedIssueId}`).then((r) => r.json()),
    enabled: !!selectedIssueId && !isEditing,
  })

  // 저장
  const saveMutation = useMutation({
    mutationFn: (data: { id?: number; category: string; title: string; content: string; status: string; priority: string }) => {
      if (data.id) {
        return fetch(`/api/issues/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then((r) => r.json())
      }
      return fetch('/api/issues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      const newId = result.id || selectedIssueId
      if (newId) {
        setSelectedIssueId(Number(newId))
        queryClient.invalidateQueries({ queryKey: ['issue', Number(newId)] })
      }
      setIsEditing(false)
      toast.success('저장되었습니다.')
    },
  })

  // 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/issues/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issues'] })
      handleNew()
      toast.success('삭제되었습니다.')
    },
  })

  // 체크리스트 추가
  const addCheckMutation = useMutation({
    mutationFn: (data: { issueId: number; content: string }) =>
      fetch(`/api/issues/${data.issueId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: data.content }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', selectedIssueId] })
      setCheckInput('')
      checkInputRef.current?.focus()
    },
  })

  // 체크리스트 토글
  const toggleCheckMutation = useMutation({
    mutationFn: (checkId: number) =>
      fetch(`/api/issues/${selectedIssueId}/checklist/${checkId}`, { method: 'PATCH' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', selectedIssueId] })
    },
  })

  // 체크리스트 삭제
  const deleteCheckMutation = useMutation({
    mutationFn: (checkId: number) =>
      fetch(`/api/issues/${selectedIssueId}/checklist/${checkId}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['issue', selectedIssueId] })
    },
  })

  const gridData = useMemo(() =>
    issues.map((p, i) => ({
      ...p,
      rn: i + 1,
      categoryLabel: categoryMap[p.category] || p.category,
      statusLabel: STATUS_LABELS[p.status] || p.status,
      priorityLabel: PRIORITY_LABELS[p.priority] || p.priority,
      dateDisplay: p.createdAt.slice(0, 10),
    })),
    [issues]
  )

  const handleRowClick = (row: Record<string, unknown>) => {
    setSelectedIssueId(row.id as number)
    setIsEditing(false)
    setCheckInput('')
  }

  const handleNew = () => {
    setSelectedIssueId(null)
    setIsEditing(true)
    setFormCategory('COMMON')
    setFormTitle('')
    setFormContent('')
    setFormStatus('OPEN')
    setFormPriority('MEDIUM')
    setCheckInput('')
  }

  const handleEdit = () => {
    if (!issueDetail) return
    setFormCategory(issueDetail.category)
    setFormTitle(issueDetail.title)
    setFormContent(issueDetail.content)
    setFormStatus(issueDetail.status)
    setFormPriority(issueDetail.priority)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!formTitle.trim()) {
      alert('제목을 입력하세요.', '입력 오류')
      return
    }
    if (!formContent.trim()) {
      alert('내용을 입력하세요.', '입력 오류')
      return
    }
    saveMutation.mutate({
      id: selectedIssueId || undefined,
      category: formCategory,
      title: formTitle,
      content: formContent,
      status: formStatus,
      priority: formPriority,
    })
  }

  const handleDelete = async () => {
    if (!selectedIssueId) return
    const ok = await confirm({
      title: '삭제 확인',
      description: '이 이슈를 삭제하시겠습니까? 체크리스트도 함께 삭제됩니다.',
    })
    if (ok) deleteMutation.mutate(selectedIssueId)
  }

  const handleCancel = () => {
    if (selectedIssueId) {
      setIsEditing(false)
    } else {
      handleNew()
    }
  }

  const handleAddCheck = () => {
    if (!selectedIssueId || !checkInput.trim()) return
    addCheckMutation.mutate({ issueId: selectedIssueId, content: checkInput })
  }

  const checklist = issueDetail?.checklist ?? []
  const checkedCount = checklist.filter((c) => c.checked === 1).length

  const thStyle = 'bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal text-sm whitespace-nowrap'
  const tdStyle = 'border border-gray-200 px-3 py-1'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 타이틀 + 검색 */}
      <div className="bg-white rounded border mb-4">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <h1 className="text-lg font-bold">이슈 관리</h1>
          <div className="flex items-center gap-2">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
            <input
              type="text"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="제목 검색"
              className="border rounded px-2 py-1 text-sm w-36"
            />
          </div>
        </div>
      </div>

      {/* 좌우 분할 */}
      <div className="flex gap-4">
        {/* 좌: 이슈 목록 */}
        <div className="w-[45%] min-w-[340px] bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">이슈 목록 ({issues.length}건)</span>
            <button
              onClick={handleNew}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              신규
            </button>
          </div>
          <SimpleTabulator
            columns={columns}
            data={gridData}
            height={500}
            onRowClick={handleRowClick}
            selectedRowId={selectedIssueId}
            placeholder="이슈가 없습니다."
          />
        </div>

        {/* 우: 상세 + 체크리스트 */}
        <div className="flex-1 bg-white rounded border overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">
              {isEditing ? (selectedIssueId ? '이슈 수정' : '이슈 작성') : '이슈 상세'}
            </span>
            <div className="flex gap-1">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                    저장
                  </button>
                  <button onClick={handleCancel} className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500">
                    취소
                  </button>
                </>
              ) : selectedIssueId ? (
                <>
                  <button onClick={handleEdit} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                    수정
                  </button>
                  <button onClick={handleDelete} className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                    삭제
                  </button>
                </>
              ) : null}
            </div>
          </div>

          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            {isEditing ? (
              /* 편집 모드 */
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <th className={thStyle} style={{ width: '90px' }}>
                      카테고리 <span className="text-red-500">*</span>
                    </th>
                    <td className={tdStyle}>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {CATEGORIES.filter((c) => c.value !== 'ALL').map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>상태</th>
                    <td className={tdStyle}>
                      <select
                        value={formStatus}
                        onChange={(e) => setFormStatus(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {STATUSES.filter((s) => s.value !== 'ALL').map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>우선순위</th>
                    <td className={tdStyle}>
                      <select
                        value={formPriority}
                        onChange={(e) => setFormPriority(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        {PRIORITIES.filter((p) => p.value !== 'ALL').map((p) => (
                          <option key={p.value} value={p.value}>{p.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>
                      제목 <span className="text-red-500">*</span>
                    </th>
                    <td className={tdStyle}>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        placeholder="제목을 입력하세요"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>
                      내용 <span className="text-red-500">*</span>
                    </th>
                    <td className={tdStyle}>
                      <textarea
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        rows={10}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="이슈 내용을 작성하세요"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : issueDetail ? (
              /* 조회 모드 */
              <>
                <table className="w-full border-collapse text-sm mb-4">
                  <tbody>
                    <tr>
                      <th className={thStyle} style={{ width: '90px' }}>카테고리</th>
                      <td className={tdStyle}>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">
                          {categoryMap[issueDetail.category] || issueDetail.category}
                        </span>
                      </td>
                      <th className={thStyle} style={{ width: '70px' }}>작성자</th>
                      <td className={tdStyle}>{issueDetail.author}</td>
                    </tr>
                    <tr>
                      <th className={thStyle}>상태</th>
                      <td className={tdStyle}>
                        <span className={`text-xs px-2 py-0.5 rounded ${STATUS_COLORS[issueDetail.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_LABELS[issueDetail.status] || issueDetail.status}
                        </span>
                      </td>
                      <th className={thStyle}>우선순위</th>
                      <td className={tdStyle}>
                        <span className={`text-xs px-2 py-0.5 rounded ${PRIORITY_COLORS[issueDetail.priority] || 'bg-gray-100 text-gray-600'}`}>
                          {PRIORITY_LABELS[issueDetail.priority] || issueDetail.priority}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <th className={thStyle}>제목</th>
                      <td className={tdStyle} colSpan={3}>{issueDetail.title}</td>
                    </tr>
                    <tr>
                      <th className={thStyle}>작성일</th>
                      <td className={tdStyle}>{issueDetail.createdAt.slice(0, 10)}</td>
                      <th className={thStyle}>수정일</th>
                      <td className={tdStyle}>{issueDetail.updatedAt.slice(0, 10)}</td>
                    </tr>
                    <tr>
                      <td className={tdStyle} colSpan={4}>
                        <div className="whitespace-pre-wrap min-h-[80px] py-1">{issueDetail.content}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>

                {/* 체크리스트 섹션 */}
                <div className="border rounded">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                    <span className="font-medium text-sm">
                      체크리스트
                      {checklist.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({checkedCount}/{checklist.length} 완료)
                        </span>
                      )}
                    </span>
                    {checklist.length > 0 && (
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-1.5">
                          <div
                            className="bg-green-500 h-1.5 rounded-full transition-all"
                            style={{ width: `${(checkedCount / checklist.length) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">
                          {Math.round((checkedCount / checklist.length) * 100)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 항목 리스트 */}
                  <div className="divide-y">
                    {checklist.length === 0 ? (
                      <p className="text-center text-xs text-gray-400 py-4">체크리스트 항목이 없습니다.</p>
                    ) : (
                      checklist.map((item) => (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 group">
                          <input
                            type="checkbox"
                            checked={item.checked === 1}
                            onChange={() => toggleCheckMutation.mutate(item.id)}
                            className="w-4 h-4 cursor-pointer accent-green-600"
                          />
                          <span className={`flex-1 text-sm ${item.checked === 1 ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                            {item.content}
                          </span>
                          <button
                            onClick={() => deleteCheckMutation.mutate(item.id)}
                            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs px-1 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 항목 추가 */}
                  <div className="flex gap-2 p-2 border-t bg-gray-50">
                    <input
                      ref={checkInputRef}
                      type="text"
                      value={checkInput}
                      onChange={(e) => setCheckInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleAddCheck() }}
                      placeholder="체크리스트 항목 입력 후 Enter 또는 추가"
                      className="flex-1 border rounded px-2 py-1 text-sm"
                    />
                    <button
                      onClick={handleAddCheck}
                      disabled={!checkInput.trim()}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      추가
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-sm text-gray-400 mt-16">이슈를 선택하거나 신규 버튼을 클릭하세요.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
