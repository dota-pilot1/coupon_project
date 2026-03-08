'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useConfirmDialog } from '@/components/ConfirmDialog'

// ─── 타입 ───────────────────────────────────────────
type FigmaPost = {
  id: number
  category: string
  title: string
  figmaUrl: string
  description: string | null
  author: string
  createdAt: string
  updatedAt: string
}

type ChecklistItem = {
  id: number
  figmaId: number
  content: string
  checked: number
  createdAt: string
}

type FigmaDetail = FigmaPost & { checklist: ChecklistItem[] }

// ─── 카테고리 ────────────────────────────────────────
const CATEGORIES = [
  { value: 'ALL', label: '전체' },
  { value: 'COMMON', label: '공통' },
  { value: 'COUPON_MASTER', label: '쿠폰마스터' },
  { value: 'APPROVAL', label: '승인관리' },
  { value: 'ISSUANCE', label: '쿠폰발급' },
  { value: 'USAGE', label: '사용현황' },
]

const CATEGORY_COLORS: Record<string, string> = {
  COMMON: 'bg-gray-100 text-gray-700',
  COUPON_MASTER: 'bg-blue-100 text-blue-700',
  APPROVAL: 'bg-yellow-100 text-yellow-700',
  ISSUANCE: 'bg-green-100 text-green-700',
  USAGE: 'bg-purple-100 text-purple-700',
}

// Figma URL → embed URL 변환
function toEmbedUrl(url: string): string {
  if (!url) return ''
  if (url.includes('figma.com/embed')) return url
  try {
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
  } catch {
    return url
  }
}

// ─── 메인 컴포넌트 ───────────────────────────────────
export default function FigmaPage() {
  const queryClient = useQueryClient()
  const { confirm } = useConfirmDialog()

  const [filterCategory, setFilterCategory] = useState('ALL')
  const [filterKeyword, setFilterKeyword] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [mode, setMode] = useState<'view' | 'create' | 'edit'>('view')

  // 폼 상태
  const [formCategory, setFormCategory] = useState('COMMON')
  const [formTitle, setFormTitle] = useState('')
  const [formFigmaUrl, setFormFigmaUrl] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')

  // 체크리스트
  const [checkInput, setCheckInput] = useState('')
  const checkInputRef = useRef<HTMLInputElement>(null)

  // ─── 목록 조회 ─────────────────────────────────────
  const { data: list = [] } = useQuery<FigmaPost[]>({
    queryKey: ['figma', filterCategory, filterKeyword],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (filterCategory !== 'ALL') params.set('category', filterCategory)
      if (filterKeyword) params.set('keyword', filterKeyword)
      const res = await fetch(`/api/figma?${params}`)
      return res.json()
    },
  })

  // ─── 상세 조회 ─────────────────────────────────────
  const { data: detail } = useQuery<FigmaDetail>({
    queryKey: ['figma', selectedId],
    queryFn: async () => {
      const res = await fetch(`/api/figma/${selectedId}`)
      return res.json()
    },
    enabled: !!selectedId && mode === 'view',
  })

  // ─── 저장 (생성/수정) ──────────────────────────────
  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        category: formCategory,
        title: formTitle,
        figmaUrl: formFigmaUrl,
        description: formDescription,
      }
      const res = mode === 'create'
        ? await fetch('/api/figma', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
        : await fetch(`/api/figma/${selectedId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || '저장 실패')
      }
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['figma'] })
      toast.success('저장되었습니다.')
      const newId = mode === 'create' ? Number(data.id) : selectedId!
      setSelectedId(newId)
      setMode('view')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  // ─── 삭제 ──────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async () => {
      await fetch(`/api/figma/${selectedId}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['figma'] })
      toast.success('삭제되었습니다.')
      setSelectedId(null)
      setMode('view')
    },
  })

  // ─── 체크리스트 추가 ───────────────────────────────
  const addCheckMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/figma/${selectedId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['figma', selectedId] })
      setCheckInput('')
      checkInputRef.current?.focus()
    },
  })

  // ─── 체크리스트 토글 ───────────────────────────────
  const toggleCheckMutation = useMutation({
    mutationFn: async (checkId: number) =>
      fetch(`/api/figma/${selectedId}/checklist/${checkId}`, { method: 'PATCH' }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['figma', selectedId] }),
  })

  // ─── 체크리스트 삭제 ───────────────────────────────
  const deleteCheckMutation = useMutation({
    mutationFn: async (checkId: number) =>
      fetch(`/api/figma/${selectedId}/checklist/${checkId}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['figma', selectedId] }),
  })

  const handleAddCheck = useCallback(() => {
    if (!checkInput.trim()) return
    addCheckMutation.mutate(checkInput.trim())
  }, [checkInput, addCheckMutation])

  // ─── 신규 시작 ──────────────────────────────────────
  const handleNew = () => {
    setSelectedId(null)
    setFormCategory('COMMON')
    setFormTitle('')
    setFormFigmaUrl('')
    setFormDescription('')
    setPreviewUrl('')
    setMode('create')
  }

  // ─── 수정 시작 ──────────────────────────────────────
  const handleEdit = () => {
    if (!detail) return
    setFormCategory(detail.category)
    setFormTitle(detail.title)
    setFormFigmaUrl(detail.figmaUrl)
    setFormDescription(detail.description || '')
    setPreviewUrl('')
    setMode('edit')
  }

  // ─── 삭제 확인 ──────────────────────────────────────
  const handleDeleteClick = async () => {
    const ok = await confirm({
      title: '피그마 삭제',
      description: '이 항목을 삭제하시겠습니까? 체크리스트도 함께 삭제됩니다.',
    })
    if (ok) deleteMutation.mutate()
  }

  // ─── 취소 ──────────────────────────────────────────
  const handleCancel = () => {
    if (selectedId) {
      setMode('view')
    } else {
      setMode('view')
      setSelectedId(null)
    }
  }

  const checklist = detail?.checklist ?? []
  const checkedCount = checklist.filter((c) => c.checked === 1).length

  const thStyle = 'bg-gray-50 text-xs text-gray-500 font-medium px-3 py-2 text-left w-24 whitespace-nowrap'
  const tdStyle = 'px-3 py-2 text-sm text-gray-800'

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">피그마 관리</h1>
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
          <input
            type="text"
            placeholder="제목 검색"
            value={filterKeyword}
            onChange={(e) => setFilterKeyword(e.target.value)}
            className="border rounded px-2 py-1 text-sm w-40"
          />
        </div>
      </div>

      <div className="flex gap-4">
        {/* ─── 좌: 목록 ─── */}
        <div className="w-72 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500">목록 ({list.length}건)</span>
            <button
              onClick={handleNew}
              className="px-3 py-1 text-xs bg-pink-600 text-white rounded hover:bg-pink-700"
            >
              신규
            </button>
          </div>
          <div className="border rounded overflow-hidden">
            {list.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">등록된 항목이 없습니다.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">카테고리</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium">제목</th>
                    <th className="px-3 py-2 text-left text-xs text-gray-500 font-medium w-20">작성일</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {list.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => { setSelectedId(item.id); setMode('view') }}
                      className={`cursor-pointer hover:bg-gray-50 ${selectedId === item.id ? 'bg-blue-50' : ''}`}
                    >
                      <td className="px-3 py-2">
                        <span className={`text-xs px-1.5 py-0.5 rounded ${CATEGORY_COLORS[item.category] || 'bg-gray-100 text-gray-600'}`}>
                          {CATEGORIES.find((c) => c.value === item.category)?.label || item.category}
                        </span>
                      </td>
                      <td className="px-3 py-2 truncate max-w-[120px] text-xs">{item.title}</td>
                      <td className="px-3 py-2 text-xs text-gray-400">{item.createdAt.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ─── 우: 상세/편집 ─── */}
        <div className="flex-1 border rounded p-4 overflow-auto">
          {/* ── 편집 폼 ── */}
          {(mode === 'create' || mode === 'edit') && (
            <>
              <div className="flex items-center justify-between mb-3">
                <span className="font-semibold text-sm">{mode === 'create' ? '신규 등록' : '수정'}</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-40"
                  >
                    저장
                  </button>
                  <button
                    onClick={handleCancel}
                    className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                  >
                    취소
                  </button>
                </div>
              </div>

              <table className="w-full border rounded text-sm mb-4">
                <tbody className="divide-y">
                  <tr>
                    <th className={thStyle}>카테고리 *</th>
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
                    <th className={thStyle}>제목 *</th>
                    <td className={tdStyle}>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        className="w-full border rounded px-2 py-1 text-sm"
                        placeholder="제목을 입력하세요"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>Figma URL *</th>
                    <td className={tdStyle}>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={formFigmaUrl}
                          onChange={(e) => setFormFigmaUrl(e.target.value)}
                          className="flex-1 border rounded px-2 py-1 text-sm"
                          placeholder="https://www.figma.com/file/..."
                        />
                        <button
                          type="button"
                          onClick={() => setPreviewUrl(formFigmaUrl)}
                          className="px-3 py-1 text-xs bg-pink-100 text-pink-700 rounded hover:bg-pink-200"
                        >
                          미리보기
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>설명</th>
                    <td className={tdStyle}>
                      <textarea
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        rows={3}
                        className="w-full border rounded px-2 py-1 text-sm resize-none"
                        placeholder="설명 (선택사항)"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* 편집 모드 미리보기 */}
              {previewUrl && (
                <div className="border rounded-lg overflow-hidden mb-4">
                  <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                    <span className="text-sm font-semibold text-gray-700">Figma 미리보기</span>
                    <button
                      type="button"
                      onClick={() => setPreviewUrl('')}
                      className="text-xs text-gray-400 hover:text-gray-600"
                    >
                      닫기
                    </button>
                  </div>
                  <iframe
                    src={toEmbedUrl(previewUrl)}
                    className="w-full"
                    style={{ height: '500px', border: 'none' }}
                    allowFullScreen
                  />
                </div>
              )}
            </>
          )}

          {/* ── 뷰 모드 ── */}
          {mode === 'view' && (
            <>
              {detail ? (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-sm">상세</span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleEdit}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  <table className="w-full border rounded text-sm mb-4">
                    <tbody className="divide-y">
                      <tr>
                        <th className={thStyle}>카테고리</th>
                        <td className={tdStyle}>
                          <span className={`text-xs px-2 py-0.5 rounded ${CATEGORY_COLORS[detail.category] || 'bg-gray-100 text-gray-600'}`}>
                            {CATEGORIES.find((c) => c.value === detail.category)?.label || detail.category}
                          </span>
                        </td>
                        <th className={thStyle}>작성자</th>
                        <td className={tdStyle}>{detail.author}</td>
                      </tr>
                      <tr>
                        <th className={thStyle}>제목</th>
                        <td className={tdStyle} colSpan={3}>{detail.title}</td>
                      </tr>
                      <tr>
                        <th className={thStyle}>작성일</th>
                        <td className={tdStyle}>{detail.createdAt.slice(0, 10)}</td>
                        <th className={thStyle}>수정일</th>
                        <td className={tdStyle}>{detail.updatedAt.slice(0, 10)}</td>
                      </tr>
                      {detail.description && (
                        <tr>
                          <th className={thStyle}>설명</th>
                          <td className={tdStyle} colSpan={3}>
                            <div className="whitespace-pre-wrap">{detail.description}</div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Figma 임베드 */}
                  <div className="border rounded-lg overflow-hidden mb-4">
                    <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-sm font-semibold text-gray-700">Figma</span>
                      <a
                        href={detail.figmaUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-pink-600 hover:text-pink-800"
                      >
                        원본 열기 ↗
                      </a>
                    </div>
                    <iframe
                      src={toEmbedUrl(detail.figmaUrl)}
                      className="w-full"
                      style={{ height: '600px', border: 'none' }}
                      allowFullScreen
                    />
                  </div>

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

                    <div className="flex gap-2 p-2 border-t bg-gray-50">
                      <input
                        ref={checkInputRef}
                        type="text"
                        value={checkInput}
                        onChange={(e) => setCheckInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) handleAddCheck() }}
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
                <p className="text-center text-sm text-gray-400 mt-16">항목을 선택하거나 신규 버튼을 클릭하세요.</p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
