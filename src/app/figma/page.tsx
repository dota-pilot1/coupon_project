'use client'

import { useState, useRef, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useConfirmDialog } from '@/components/ConfirmDialog'

// ─── Types ───────────────────────────────────────────────────────────────────

type FigmaPage = {
  id: number
  category: string
  title: string
  description: string | null
  author: string
  createdAt: string
  updatedAt: string
}

type CheckItem = {
  id: number
  itemId: number
  content: string
  checked: number
  createdAt: string
}

type FigmaItem = {
  id: number
  pageId: number
  title: string
  figmaUrl: string
  version: string | null
  author: string
  createdAt: string
  updatedAt: string
  checklist: CheckItem[]
}

type FigmaPageDetail = FigmaPage & { items: FigmaItem[] }

// ─── Constants ────────────────────────────────────────────────────────────────

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

const CATEGORY_LABELS: Record<string, string> = {
  COMMON: '공통',
  COUPON_MASTER: '쿠폰마스터',
  APPROVAL: '승인관리',
  ISSUANCE: '쿠폰발급',
  USAGE: '사용현황',
}

function toEmbedUrl(url: string): string {
  if (!url) return ''
  if (url.includes('figma.com/embed')) return url
  try {
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
  } catch {
    return url
  }
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function FigmaPage() {
  const queryClient = useQueryClient()
  const { confirm } = useConfirmDialog()

  // ── Filter ──
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [filterKeyword, setFilterKeyword] = useState('')

  // ── Page (좌측 화면 목록) ──
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null)
  const [pageMode, setPageMode] = useState<'view' | 'create' | 'edit'>('view')
  const [pageFormCategory, setPageFormCategory] = useState('COMMON')
  const [pageFormTitle, setPageFormTitle] = useState('')
  const [pageFormDescription, setPageFormDescription] = useState('')

  // ── Item (우측 피그마 항목) ──
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [itemMode, setItemMode] = useState<'view' | 'create' | 'edit'>('view')
  const [itemFormTitle, setItemFormTitle] = useState('')
  const [itemFormFigmaUrl, setItemFormFigmaUrl] = useState('')
  const [itemFormVersion, setItemFormVersion] = useState('')

  // ── Checklist ──
  const [checkInput, setCheckInput] = useState('')
  const checkInputRef = useRef<HTMLInputElement>(null)

  // ─── Queries ─────────────────────────────────────────────────────────────────

  const { data: pages = [] } = useQuery<FigmaPage[]>({
    queryKey: ['figmaPages'],
    queryFn: () => fetch('/api/figma/pages').then((r) => r.json()),
  })

  const { data: pageDetail } = useQuery<FigmaPageDetail>({
    queryKey: ['figmaPage', selectedPageId],
    queryFn: () => fetch(`/api/figma/pages/${selectedPageId}`).then((r) => r.json()),
    enabled: !!selectedPageId,
  })

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const filteredPages = useMemo(() => {
    let list = pages
    if (filterCategory !== 'ALL') list = list.filter((p) => p.category === filterCategory)
    if (filterKeyword.trim()) list = list.filter((p) => p.title.includes(filterKeyword.trim()))
    return list
  }, [pages, filterCategory, filterKeyword])

  const selectedItem = useMemo(
    () => pageDetail?.items.find((i) => i.id === selectedItemId) ?? null,
    [pageDetail, selectedItemId]
  )

  // ─── Page Mutations ───────────────────────────────────────────────────────────

  const savePageMutation = useMutation({
    mutationFn: (data: { id?: number; category: string; title: string; description: string | null }) => {
      if (data.id) {
        return fetch(`/api/figma/pages/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then((r) => r.json())
      }
      return fetch('/api/figma/pages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['figmaPages'] })
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: ['figmaPage', variables.id] })
        toast.success('화면이 수정되었습니다.')
      } else {
        setSelectedPageId(result.id)
        toast.success('화면이 등록되었습니다.')
      }
      setPageMode('view')
    },
    onError: () => toast.error('저장에 실패했습니다.'),
  })

  const deletePageMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/figma/pages/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['figmaPages'] })
      setSelectedPageId(null)
      setSelectedItemId(null)
      setPageMode('view')
      toast.success('화면이 삭제되었습니다.')
    },
    onError: () => toast.error('삭제에 실패했습니다.'),
  })

  // ─── Item Mutations ───────────────────────────────────────────────────────────

  const saveItemMutation = useMutation({
    mutationFn: (data: {
      id?: number
      pageId: number
      title: string
      figmaUrl: string
      version: string
    }) => {
      if (data.id) {
        return fetch(`/api/figma/pages/${data.pageId}/items/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then((r) => r.json())
      }
      return fetch(`/api/figma/pages/${data.pageId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['figmaPage', variables.pageId] })
      if (!variables.id) setSelectedItemId(result.id)
      setItemMode('view')
      toast.success(variables.id ? '항목이 수정되었습니다.' : '항목이 등록되었습니다.')
    },
    onError: () => toast.error('저장에 실패했습니다.'),
  })

  const deleteItemMutation = useMutation({
    mutationFn: ({ pageId, itemId }: { pageId: number; itemId: number }) =>
      fetch(`/api/figma/pages/${pageId}/items/${itemId}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['figmaPage', variables.pageId] })
      setSelectedItemId(null)
      setItemMode('view')
      toast.success('항목이 삭제되었습니다.')
    },
    onError: () => toast.error('삭제에 실패했습니다.'),
  })

  // ─── Checklist Mutations ──────────────────────────────────────────────────────

  const addCheckMutation = useMutation({
    mutationFn: ({ pageId, itemId, content }: { pageId: number; itemId: number; content: string }) =>
      fetch(`/api/figma/pages/${pageId}/items/${itemId}/checklist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }).then((r) => r.json()),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['figmaPage', variables.pageId] })
      setCheckInput('')
      checkInputRef.current?.focus()
    },
    onError: () => toast.error('추가에 실패했습니다.'),
  })

  const toggleCheckMutation = useMutation({
    mutationFn: ({
      pageId,
      itemId,
      checkId,
      checked,
    }: {
      pageId: number
      itemId: number
      checkId: number
      checked: boolean
    }) =>
      fetch(`/api/figma/pages/${pageId}/items/${itemId}/checklist/${checkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked }),
      }).then((r) => r.json()),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({ queryKey: ['figmaPage', variables.pageId] }),
    onError: () => toast.error('업데이트에 실패했습니다.'),
  })

  const deleteCheckMutation = useMutation({
    mutationFn: ({ pageId, itemId, checkId }: { pageId: number; itemId: number; checkId: number }) =>
      fetch(`/api/figma/pages/${pageId}/items/${itemId}/checklist/${checkId}`, {
        method: 'DELETE',
      }).then((r) => r.json()),
    onSuccess: (_, variables) =>
      queryClient.invalidateQueries({ queryKey: ['figmaPage', variables.pageId] }),
    onError: () => toast.error('삭제에 실패했습니다.'),
  })

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleSelectPage = (page: FigmaPage) => {
    setSelectedPageId(page.id)
    setSelectedItemId(null)
    setPageMode('view')
    setItemMode('view')
  }

  const handleNewPage = () => {
    setSelectedPageId(null)
    setSelectedItemId(null)
    setPageMode('create')
    setItemMode('view')
    setPageFormCategory('COMMON')
    setPageFormTitle('')
    setPageFormDescription('')
  }

  const handleEditPage = () => {
    if (!pageDetail) return
    setPageMode('edit')
    setPageFormCategory(pageDetail.category)
    setPageFormTitle(pageDetail.title)
    setPageFormDescription(pageDetail.description ?? '')
  }

  const handleSavePage = () => {
    if (!pageFormTitle.trim()) {
      toast.error('제목을 입력하세요.')
      return
    }
    savePageMutation.mutate({
      id: pageMode === 'edit' ? selectedPageId! : undefined,
      category: pageFormCategory,
      title: pageFormTitle,
      description: pageFormDescription.trim() || null,
    })
  }

  const handleDeletePage = async () => {
    if (!selectedPageId) return
    const ok = await confirm({
      title: '화면 삭제',
      description: '이 화면과 모든 피그마 항목이 삭제됩니다. 계속하시겠습니까?',
    })
    if (ok) deletePageMutation.mutate(selectedPageId)
  }

  const handleNewItem = () => {
    setSelectedItemId(null)
    setItemMode('create')
    setItemFormTitle('')
    setItemFormFigmaUrl('')
    setItemFormVersion('')
  }

  const handleEditItem = () => {
    if (!selectedItem) return
    setItemMode('edit')
    setItemFormTitle(selectedItem.title)
    setItemFormFigmaUrl(selectedItem.figmaUrl)
    setItemFormVersion(selectedItem.version ?? '')
  }

  const handleSaveItem = () => {
    if (!itemFormTitle.trim() || !itemFormFigmaUrl.trim()) {
      toast.error('제목과 피그마 URL을 입력하세요.')
      return
    }
    if (!selectedPageId) return
    saveItemMutation.mutate({
      id: itemMode === 'edit' ? selectedItemId! : undefined,
      pageId: selectedPageId,
      title: itemFormTitle,
      figmaUrl: itemFormFigmaUrl,
      version: itemFormVersion,
    })
  }

  const handleDeleteItem = async () => {
    if (!selectedItemId || !selectedPageId) return
    const ok = await confirm({
      title: '항목 삭제',
      description: '이 피그마 항목과 체크리스트가 삭제됩니다.',
    })
    if (ok) deleteItemMutation.mutate({ pageId: selectedPageId, itemId: selectedItemId })
  }

  const handleAddCheck = () => {
    if (!checkInput.trim() || !selectedItemId || !selectedPageId) return
    addCheckMutation.mutate({ pageId: selectedPageId, itemId: selectedItemId, content: checkInput.trim() })
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────

  const thStyle = 'bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal text-sm whitespace-nowrap'
  const tdStyle = 'border border-gray-200 px-3 py-1'

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 상단 검색 바 */}
      <div className="bg-white rounded border mb-4">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <h1 className="text-lg font-bold">피그마 관리</h1>
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
              value={filterKeyword}
              onChange={(e) => setFilterKeyword(e.target.value)}
              placeholder="화면 제목 검색"
              className="border rounded px-2 py-1 text-sm w-40"
            />
          </div>
        </div>
      </div>

      {/* 2단 레이아웃 */}
      <div className="flex gap-4 items-start">

        {/* ── 좌: 화면 목록 ── */}
        <div className="w-[300px] shrink-0 bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">화면 목록 ({filteredPages.length}건)</span>
            <button
              onClick={handleNewPage}
              className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              신규
            </button>
          </div>

          <div className="overflow-y-auto" style={{ maxHeight: 600 }}>
            {filteredPages.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-400">화면이 없습니다.</div>
            ) : (
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b text-xs text-gray-500">
                    <th className="px-2 py-2 text-center font-medium w-8">No.</th>
                    <th className="px-3 py-2 text-left font-medium">제목</th>
                    <th className="px-2 py-2 text-center font-medium w-16">카테고리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPages.map((page, i) => (
                    <tr
                      key={page.id}
                      onClick={() => handleSelectPage(page)}
                      className={`border-b cursor-pointer hover:bg-blue-50 transition-colors ${
                        selectedPageId === page.id ? 'bg-blue-100' : ''
                      }`}
                    >
                      <td className="px-2 py-2 text-center text-xs text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-xs font-medium max-w-[140px] truncate">{page.title}</td>
                      <td className="px-2 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-xs ${CATEGORY_COLORS[page.category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {CATEGORY_LABELS[page.category] ?? page.category}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── 우: 화면 상세 + 항목 ── */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">

          {/* ─ 화면 정보 / 신규 폼 ─ */}
          {(pageMode !== 'view' || selectedPageId) ? (
            <div className="bg-white rounded border">
              <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                <span className="font-medium text-sm">
                  {pageMode === 'create' ? '화면 등록' : pageMode === 'edit' ? '화면 수정' : '화면 정보'}
                </span>
                <div className="flex gap-1">
                  {pageMode === 'view' && selectedPageId ? (
                    <>
                      <button
                        onClick={handleEditPage}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={handleDeletePage}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        삭제
                      </button>
                    </>
                  ) : pageMode !== 'view' ? (
                    <>
                      <button
                        onClick={handleSavePage}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => {
                          if (pageMode === 'edit' && selectedPageId) {
                            setPageMode('view')
                          } else {
                            setSelectedPageId(null)
                            setPageMode('view')
                          }
                        }}
                        className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                      >
                        취소
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <div className="p-4">
                {pageMode !== 'view' ? (
                  /* 편집 폼 */
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      <tr>
                        <th className={thStyle} style={{ width: 100 }}>
                          카테고리 <span className="text-red-500">*</span>
                        </th>
                        <td className={tdStyle}>
                          <select
                            value={pageFormCategory}
                            onChange={(e) => setPageFormCategory(e.target.value)}
                            className="border rounded px-2 py-1 text-sm"
                          >
                            {CATEGORIES.filter((c) => c.value !== 'ALL').map((c) => (
                              <option key={c.value} value={c.value}>{c.label}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                      <tr>
                        <th className={thStyle}>제목 <span className="text-red-500">*</span></th>
                        <td className={tdStyle}>
                          <input
                            type="text"
                            value={pageFormTitle}
                            onChange={(e) => setPageFormTitle(e.target.value)}
                            placeholder="화면 제목"
                            className="border rounded px-2 py-1 text-sm w-full"
                          />
                        </td>
                      </tr>
                      <tr>
                        <th className={thStyle}>설명</th>
                        <td className={tdStyle}>
                          <input
                            type="text"
                            value={pageFormDescription}
                            onChange={(e) => setPageFormDescription(e.target.value)}
                            placeholder="화면 설명 (선택)"
                            className="border rounded px-2 py-1 text-sm w-full"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                ) : pageDetail ? (
                  /* 조회 */
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      <tr>
                        <th className={thStyle} style={{ width: 100 }}>카테고리</th>
                        <td className={tdStyle}>
                          <span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_COLORS[pageDetail.category] ?? 'bg-gray-100 text-gray-600'}`}>
                            {CATEGORY_LABELS[pageDetail.category] ?? pageDetail.category}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <th className={thStyle}>제목</th>
                        <td className={tdStyle + ' font-medium'}>{pageDetail.title}</td>
                      </tr>
                      {pageDetail.description && (
                        <tr>
                          <th className={thStyle}>설명</th>
                          <td className={tdStyle + ' text-gray-600'}>{pageDetail.description}</td>
                        </tr>
                      )}
                      <tr>
                        <th className={thStyle}>작성자</th>
                        <td className={tdStyle}>{pageDetail.author}</td>
                      </tr>
                      <tr>
                        <th className={thStyle}>등록일</th>
                        <td className={tdStyle + ' text-gray-500'}>{pageDetail.createdAt.slice(0, 10)}</td>
                      </tr>
                    </tbody>
                  </table>
                ) : (
                  <div className="text-sm text-gray-400">로딩 중...</div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded border p-10 text-center text-sm text-gray-400">
              왼쪽에서 화면을 선택하거나 신규 버튼을 눌러 화면을 등록하세요.
            </div>
          )}

          {/* ─ 피그마 항목 목록 (page 선택 후) ─ */}
          {selectedPageId && (
            <>
              <div className="bg-white rounded border">
                <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                  <span className="font-medium text-sm">
                    피그마 항목 ({pageDetail?.items.length ?? 0}건)
                  </span>
                  {itemMode === 'view' ? (
                    <button
                      onClick={handleNewItem}
                      className="px-3 py-1 text-xs bg-pink-600 text-white rounded hover:bg-pink-700"
                    >
                      추가
                    </button>
                  ) : (
                    <div className="flex gap-1">
                      <button
                        onClick={handleSaveItem}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        저장
                      </button>
                      <button
                        onClick={() => {
                          setItemMode('view')
                          if (itemMode === 'create') setSelectedItemId(null)
                        }}
                        className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </div>

                {/* 항목 등록/수정 폼 */}
                {itemMode !== 'view' && (
                  <div className="p-4 border-b bg-gray-50">
                    <table className="w-full border-collapse text-sm">
                      <tbody>
                        <tr>
                          <th className={thStyle} style={{ width: 100 }}>
                            제목 <span className="text-red-500">*</span>
                          </th>
                          <td className={tdStyle}>
                            <input
                              type="text"
                              value={itemFormTitle}
                              onChange={(e) => setItemFormTitle(e.target.value)}
                              placeholder="항목 제목"
                              className="border rounded px-2 py-1 text-sm w-full"
                            />
                          </td>
                        </tr>
                        <tr>
                          <th className={thStyle}>
                            피그마 URL <span className="text-red-500">*</span>
                          </th>
                          <td className={tdStyle}>
                            <input
                              type="text"
                              value={itemFormFigmaUrl}
                              onChange={(e) => setItemFormFigmaUrl(e.target.value)}
                              placeholder="https://www.figma.com/design/..."
                              className="border rounded px-2 py-1 text-sm w-full font-mono text-xs"
                            />
                          </td>
                        </tr>
                        <tr>
                          <th className={thStyle}>버전</th>
                          <td className={tdStyle}>
                            <input
                              type="text"
                              value={itemFormVersion}
                              onChange={(e) => setItemFormVersion(e.target.value)}
                              placeholder="v1.0 (선택)"
                              className="border rounded px-2 py-1 text-sm w-40"
                            />
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {/* 항목 카드 */}
                <div className="p-3">
                  {!pageDetail?.items.length ? (
                    <div className="text-sm text-gray-400 text-center py-6">
                      피그마 항목이 없습니다. 추가 버튼을 눌러주세요.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-3">
                      {pageDetail.items.map((item) => {
                        const doneCount = item.checklist.filter((c) => c.checked).length
                        const totalCount = item.checklist.length
                        return (
                          <div
                            key={item.id}
                            onClick={() => { setSelectedItemId(item.id); setItemMode('view') }}
                            className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm w-48 min-w-[180px] ${
                              selectedItemId === item.id
                                ? 'border-pink-400 bg-pink-50 shadow-sm'
                                : 'border-gray-200 bg-white hover:border-pink-300'
                            }`}
                          >
                            <div className="font-medium text-sm truncate mb-1">{item.title}</div>
                            {item.version && (
                              <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mb-2">
                                {item.version}
                              </span>
                            )}
                            {totalCount > 0 && (
                              <div className="mt-1">
                                <div className="flex justify-between text-xs text-gray-400 mb-1">
                                  <span>체크리스트</span>
                                  <span>{doneCount}/{totalCount}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-1">
                                  <div
                                    className="bg-pink-400 h-1 rounded-full transition-all"
                                    style={{ width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* ─ 선택된 항목 상세: iframe + 체크리스트 ─ */}
              {selectedItem && itemMode === 'view' && (
                <div className="bg-white rounded border">
                  <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{selectedItem.title}</span>
                      {selectedItem.version && (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
                          {selectedItem.version}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={handleEditItem}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        수정
                      </button>
                      <button
                        onClick={handleDeleteItem}
                        className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        삭제
                      </button>
                    </div>
                  </div>

                  {/* Figma iframe */}
                  <div className="p-4 border-b">
                    <iframe
                      src={toEmbedUrl(selectedItem.figmaUrl)}
                      className="w-full rounded border bg-gray-50"
                      style={{ height: 480 }}
                      allowFullScreen
                    />
                    <div className="mt-2 text-xs text-gray-400 font-mono break-all">
                      {selectedItem.figmaUrl}
                    </div>
                  </div>

                  {/* 체크리스트 */}
                  <div className="p-4">
                    <div className="font-medium text-sm mb-3">
                      체크리스트 ({selectedItem.checklist.filter((c) => c.checked).length}/{selectedItem.checklist.length})
                    </div>
                    <div className="space-y-2 mb-3">
                      {selectedItem.checklist.length === 0 ? (
                        <div className="text-sm text-gray-400">체크리스트 항목이 없습니다.</div>
                      ) : (
                        selectedItem.checklist.map((c) => (
                          <div key={c.id} className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={!!c.checked}
                              onChange={(e) =>
                                toggleCheckMutation.mutate({
                                  pageId: selectedPageId,
                                  itemId: selectedItem.id,
                                  checkId: c.id,
                                  checked: e.target.checked,
                                })
                              }
                              className="cursor-pointer"
                            />
                            <span className={`text-sm flex-1 ${c.checked ? 'line-through text-gray-400' : ''}`}>
                              {c.content}
                            </span>
                            <button
                              onClick={() =>
                                deleteCheckMutation.mutate({
                                  pageId: selectedPageId,
                                  itemId: selectedItem.id,
                                  checkId: c.id,
                                })
                              }
                              className="text-gray-300 hover:text-red-400 text-xs px-1"
                            >
                              ✕
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        ref={checkInputRef}
                        type="text"
                        value={checkInput}
                        onChange={(e) => setCheckInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCheck()}
                        placeholder="체크리스트 항목 입력 후 Enter"
                        className="flex-1 border rounded px-2 py-1 text-sm"
                      />
                      <button
                        onClick={handleAddCheck}
                        className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        추가
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
