'use client'

import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'sonner'
import type { ColumnDefinition } from '@/components/SimpleTabulator'

const SimpleTabulator = dynamic(() => import('@/components/SimpleTabulator'), { ssr: false })

// ─── Types ────────────────────────────────────────────────────────────────────

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

const CATEGORY_LABELS: Record<string, string> = {
  COMMON: '공통',
  COUPON_MASTER: '쿠폰마스터',
  APPROVAL: '승인관리',
  ISSUANCE: '쿠폰발급',
  USAGE: '사용현황',
}

const CATEGORY_COLORS: Record<string, string> = {
  COMMON: 'bg-gray-100 text-gray-700',
  COUPON_MASTER: 'bg-blue-100 text-blue-700',
  APPROVAL: 'bg-yellow-100 text-yellow-700',
  ISSUANCE: 'bg-green-100 text-green-700',
  USAGE: 'bg-purple-100 text-purple-700',
}

const columns: ColumnDefinition[] = [
  { title: 'No.', field: 'rn', width: 50, hozAlign: 'center', headerSort: false },
  { title: '카테고리', field: 'categoryLabel', width: 90, hozAlign: 'center' },
  { title: '제목', field: 'title', minWidth: 120, hozAlign: 'left' },
  { title: '항목수', field: 'itemCount', width: 60, hozAlign: 'center' },
  { title: '등록일', field: 'dateDisplay', width: 90, hozAlign: 'center' },
]

function toEmbedUrl(url: string): string {
  if (!url) return ''
  if (url.includes('figma.com/embed')) return url
  try {
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`
  } catch {
    return url
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function FigmaManagePage() {
  const queryClient = useQueryClient()
  const { confirm } = useConfirmDialog()

  // ─ Filter ─
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [searchKeyword, setSearchKeyword] = useState('')

  // ─ Page 선택/편집 ─
  const [selectedPageId, setSelectedPageId] = useState<number | null>(null)
  const [isEditingPage, setIsEditingPage] = useState(false)   // true = page form open
  const [pageFormCategory, setPageFormCategory] = useState('COMMON')
  const [pageFormTitle, setPageFormTitle] = useState('')
  const [pageFormDescription, setPageFormDescription] = useState('')

  // ─ Item 선택/편집 ─
  const [selectedItemId, setSelectedItemId] = useState<number | null>(null)
  const [isEditingItem, setIsEditingItem] = useState(false)   // true = item form open
  const [itemFormTitle, setItemFormTitle] = useState('')
  const [itemFormFigmaUrl, setItemFormFigmaUrl] = useState('')
  const [itemFormVersion, setItemFormVersion] = useState('')

  // ─ Checklist ─
  const [checkInput, setCheckInput] = useState('')
  const checkInputRef = useRef<HTMLInputElement>(null)

  // ─── Queries ──────────────────────────────────────────────────────────────────

  const { data: pages = [] } = useQuery<FigmaPage[]>({
    queryKey: ['figmaPages'],
    queryFn: () => fetch('/api/figma/pages').then((r) => r.json()),
  })

  const { data: pageDetail } = useQuery<FigmaPageDetail>({
    queryKey: ['figmaPage', selectedPageId],
    queryFn: () => fetch(`/api/figma/pages/${selectedPageId}`).then((r) => r.json()),
    enabled: !!selectedPageId && !isEditingPage,
  })

  // ─── Derived ──────────────────────────────────────────────────────────────────

  const filteredPages = useMemo(() => {
    let list = pages
    if (filterCategory !== 'ALL') list = list.filter((p) => p.category === filterCategory)
    if (searchKeyword.trim()) list = list.filter((p) => p.title.includes(searchKeyword.trim()))
    return list
  }, [pages, filterCategory, searchKeyword])

  const gridData = useMemo(() =>
    filteredPages.map((p, i) => ({
      ...p,
      rn: i + 1,
      categoryLabel: CATEGORY_LABELS[p.category] ?? p.category,
      itemCount: '-',
      dateDisplay: p.createdAt.slice(0, 10),
    })),
    [filteredPages]
  )

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
      const id = variables.id ?? result.id
      setSelectedPageId(id)
      if (variables.id) queryClient.invalidateQueries({ queryKey: ['figmaPage', variables.id] })
      setIsEditingPage(false)
      toast.success(variables.id ? '화면이 수정되었습니다.' : '화면이 등록되었습니다.')
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
      setIsEditingPage(false)
      toast.success('화면이 삭제되었습니다.')
    },
    onError: () => toast.error('삭제에 실패했습니다.'),
  })

  // ─── Item Mutations ───────────────────────────────────────────────────────────

  const saveItemMutation = useMutation({
    mutationFn: (data: { id?: number; pageId: number; title: string; figmaUrl: string; version: string }) => {
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
      setIsEditingItem(false)
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
      setIsEditingItem(false)
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
    onSuccess: (_, { pageId }) => {
      queryClient.invalidateQueries({ queryKey: ['figmaPage', pageId] })
      setCheckInput('')
      checkInputRef.current?.focus()
    },
  })

  const toggleCheckMutation = useMutation({
    mutationFn: ({ pageId, itemId, checkId, checked }: { pageId: number; itemId: number; checkId: number; checked: boolean }) =>
      fetch(`/api/figma/pages/${pageId}/items/${itemId}/checklist/${checkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ checked }),
      }).then((r) => r.json()),
    onSuccess: (_, { pageId }) => queryClient.invalidateQueries({ queryKey: ['figmaPage', pageId] }),
  })

  const deleteCheckMutation = useMutation({
    mutationFn: ({ pageId, itemId, checkId }: { pageId: number; itemId: number; checkId: number }) =>
      fetch(`/api/figma/pages/${pageId}/items/${itemId}/checklist/${checkId}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: (_, { pageId }) => queryClient.invalidateQueries({ queryKey: ['figmaPage', pageId] }),
  })

  // ─── Handlers ────────────────────────────────────────────────────────────────

  const handleRowClick = (row: Record<string, unknown>) => {
    setSelectedPageId(row.id as number)
    setSelectedItemId(null)
    setIsEditingPage(false)
    setIsEditingItem(false)
  }

  const handleNewPage = () => {
    setSelectedPageId(null)
    setSelectedItemId(null)
    setIsEditingPage(true)
    setIsEditingItem(false)
    setPageFormCategory('COMMON')
    setPageFormTitle('')
    setPageFormDescription('')
  }

  const handleEditPage = () => {
    if (!pageDetail) return
    setIsEditingPage(true)
    setIsEditingItem(false)
    setPageFormCategory(pageDetail.category)
    setPageFormTitle(pageDetail.title)
    setPageFormDescription(pageDetail.description ?? '')
  }

  const handleSavePage = () => {
    if (!pageFormTitle.trim()) { toast.error('제목을 입력하세요.'); return }
    savePageMutation.mutate({
      id: selectedPageId && isEditingPage ? selectedPageId : undefined,
      category: pageFormCategory,
      title: pageFormTitle,
      description: pageFormDescription.trim() || null,
    })
  }

  const handleDeletePage = async () => {
    if (!selectedPageId) return
    const ok = await confirm({ title: '화면 삭제', description: '이 화면과 모든 피그마 항목이 함께 삭제됩니다.' })
    if (ok) deletePageMutation.mutate(selectedPageId)
  }

  const handleNewItem = () => {
    setSelectedItemId(null)
    setIsEditingItem(true)
    setItemFormTitle('')
    setItemFormFigmaUrl('')
    setItemFormVersion('')
  }

  const handleEditItem = () => {
    if (!selectedItem) return
    setIsEditingItem(true)
    setItemFormTitle(selectedItem.title)
    setItemFormFigmaUrl(selectedItem.figmaUrl)
    setItemFormVersion(selectedItem.version ?? '')
  }

  const handleSaveItem = () => {
    if (!itemFormTitle.trim() || !itemFormFigmaUrl.trim()) { toast.error('제목과 피그마 URL을 입력하세요.'); return }
    if (!selectedPageId) return
    saveItemMutation.mutate({
      id: isEditingItem && selectedItemId ? selectedItemId : undefined,
      pageId: selectedPageId,
      title: itemFormTitle,
      figmaUrl: itemFormFigmaUrl,
      version: itemFormVersion,
    })
  }

  const handleDeleteItem = async () => {
    if (!selectedItemId || !selectedPageId) return
    const ok = await confirm({ title: '항목 삭제', description: '이 피그마 항목과 체크리스트가 삭제됩니다.' })
    if (ok) deleteItemMutation.mutate({ pageId: selectedPageId, itemId: selectedItemId })
  }

  const handleAddCheck = () => {
    if (!checkInput.trim() || !selectedItemId || !selectedPageId) return
    addCheckMutation.mutate({ pageId: selectedPageId, itemId: selectedItemId, content: checkInput.trim() })
  }

  // ─── Styles ───────────────────────────────────────────────────────────────────

  const thStyle = 'bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal text-sm whitespace-nowrap'
  const tdStyle = 'border border-gray-200 px-3 py-1'

  // ─── Determine right panel title ──────────────────────────────────────────────

  const rightTitle = isEditingPage
    ? selectedPageId ? '화면 수정' : '화면 등록'
    : isEditingItem
    ? selectedItemId ? '피그마 항목 수정' : '피그마 항목 등록'
    : selectedPageId ? '화면 상세' : '피그마 관리'

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 p-6">

      {/* 타이틀 + 검색 */}
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
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              placeholder="화면 제목 검색"
              className="border rounded px-2 py-1 text-sm w-36"
            />
          </div>
        </div>
      </div>

      {/* 좌우 분할 */}
      <div className="flex gap-4">

        {/* ── 좌: 화면 목록 ── */}
        <div className="w-[45%] min-w-[340px] bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">화면 목록 ({filteredPages.length}건)</span>
            <button
              onClick={handleNewPage}
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
            selectedRowId={selectedPageId}
            placeholder="화면이 없습니다."
          />
        </div>

        {/* ── 우: 상세 패널 ── */}
        <div className="flex-1 bg-white rounded border overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">{rightTitle}</span>
            <div className="flex gap-1">
              {isEditingPage ? (
                <>
                  <button onClick={handleSavePage} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">저장</button>
                  <button
                    onClick={() => { setIsEditingPage(false); if (!selectedPageId) setSelectedPageId(null) }}
                    className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                  >취소</button>
                </>
              ) : isEditingItem ? (
                <>
                  <button onClick={handleSaveItem} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">저장</button>
                  <button
                    onClick={() => { setIsEditingItem(false); if (!selectedItemId) setSelectedItemId(null) }}
                    className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500"
                  >취소</button>
                </>
              ) : selectedPageId ? (
                <>
                  <button onClick={handleEditPage} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">수정</button>
                  <button onClick={handleDeletePage} className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">삭제</button>
                </>
              ) : null}
            </div>
          </div>

          <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>

            {/* ─ 화면 등록/수정 폼 ─ */}
            {isEditingPage && (
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <th className={thStyle} style={{ width: 100 }}>카테고리 <span className="text-red-500">*</span></th>
                    <td className={tdStyle}>
                      <select value={pageFormCategory} onChange={(e) => setPageFormCategory(e.target.value)} className="border rounded px-2 py-1 text-sm">
                        {CATEGORIES.filter((c) => c.value !== 'ALL').map((c) => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>제목 <span className="text-red-500">*</span></th>
                    <td className={tdStyle}>
                      <input type="text" value={pageFormTitle} onChange={(e) => setPageFormTitle(e.target.value)} placeholder="화면 제목" className="border rounded px-2 py-1 text-sm w-full" />
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>설명</th>
                    <td className={tdStyle}>
                      <input type="text" value={pageFormDescription} onChange={(e) => setPageFormDescription(e.target.value)} placeholder="설명 (선택)" className="border rounded px-2 py-1 text-sm w-full" />
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* ─ 화면 상세 조회 ─ */}
            {!isEditingPage && !isEditingItem && pageDetail && (
              <>
                {/* 기본 정보 */}
                <table className="w-full border-collapse text-sm mb-4">
                  <tbody>
                    <tr>
                      <th className={thStyle} style={{ width: 90 }}>카테고리</th>
                      <td className={tdStyle}>
                        <span className={`px-2 py-0.5 rounded text-xs ${CATEGORY_COLORS[pageDetail.category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {CATEGORY_LABELS[pageDetail.category] ?? pageDetail.category}
                        </span>
                      </td>
                      <th className={thStyle} style={{ width: 70 }}>작성자</th>
                      <td className={tdStyle}>{pageDetail.author}</td>
                    </tr>
                    <tr>
                      <th className={thStyle}>제목</th>
                      <td className={tdStyle} colSpan={3} style={{ fontWeight: 500 }}>{pageDetail.title}</td>
                    </tr>
                    {pageDetail.description && (
                      <tr>
                        <th className={thStyle}>설명</th>
                        <td className={tdStyle + ' text-gray-600'} colSpan={3}>{pageDetail.description}</td>
                      </tr>
                    )}
                    <tr>
                      <th className={thStyle}>등록일</th>
                      <td className={tdStyle}>{pageDetail.createdAt.slice(0, 10)}</td>
                      <th className={thStyle}>수정일</th>
                      <td className={tdStyle}>{pageDetail.updatedAt.slice(0, 10)}</td>
                    </tr>
                  </tbody>
                </table>

                {/* 피그마 항목 목록 */}
                <div className="border rounded-lg overflow-hidden mt-3">
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                    <span className="text-sm font-semibold text-gray-700">
                      피그마 항목
                      {pageDetail.items.length > 0 && (
                        <span className="ml-2 text-xs text-gray-500">({pageDetail.items.length}건)</span>
                      )}
                    </span>
                    <button
                      onClick={handleNewItem}
                      className="px-3 py-1 text-xs bg-pink-600 text-white rounded hover:bg-pink-700"
                    >
                      + 추가
                    </button>
                  </div>

                  {pageDetail.items.length === 0 ? (
                    <p className="text-center text-xs text-gray-400 py-6">피그마 항목이 없습니다. 추가 버튼을 눌러주세요.</p>
                  ) : (
                    <div className="p-3 flex flex-wrap gap-3">
                      {pageDetail.items.map((item) => {
                        const doneCount = item.checklist.filter((c) => c.checked).length
                        const totalCount = item.checklist.length
                        return (
                          <div
                            key={item.id}
                            onClick={() => { setSelectedItemId(item.id); setIsEditingItem(false) }}
                            className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-sm w-48 shrink-0 ${
                              selectedItemId === item.id
                                ? 'border-pink-400 bg-pink-50 shadow-sm'
                                : 'border-gray-200 hover:border-pink-300'
                            }`}
                          >
                            <div className="font-medium text-sm truncate mb-1">{item.title}</div>
                            {item.version && (
                              <span className="inline-block px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded mb-2">{item.version}</span>
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

                {/* 선택된 항목 상세: iframe + 체크리스트 */}
                {selectedItem && (
                  <>
                    {/* Figma 미리보기 */}
                    <div className="border rounded-lg overflow-hidden mt-3">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-700">{selectedItem.title}</span>
                          {selectedItem.version && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">{selectedItem.version}</span>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <button onClick={handleEditItem} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">수정</button>
                          <button onClick={handleDeleteItem} className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">삭제</button>
                        </div>
                      </div>
                      <div className="p-4">
                        <iframe
                          src={toEmbedUrl(selectedItem.figmaUrl)}
                          className="w-full rounded border bg-gray-50"
                          style={{ height: 480 }}
                          allowFullScreen
                        />
                        <div className="mt-2 text-xs text-gray-400 font-mono break-all">{selectedItem.figmaUrl}</div>
                      </div>
                    </div>

                    {/* 체크리스트 */}
                    <div className="border rounded mt-3">
                      <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b">
                        <span className="font-medium text-sm">
                          체크리스트
                          {selectedItem.checklist.length > 0 && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({selectedItem.checklist.filter((c) => c.checked).length}/{selectedItem.checklist.length} 완료)
                            </span>
                          )}
                        </span>
                        {selectedItem.checklist.length > 0 && (() => {
                          const done = selectedItem.checklist.filter((c) => c.checked).length
                          const total = selectedItem.checklist.length
                          return (
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${(done / total) * 100}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{Math.round((done / total) * 100)}%</span>
                            </div>
                          )
                        })()}
                      </div>

                      <div className="divide-y">
                        {selectedItem.checklist.length === 0 ? (
                          <p className="text-center text-xs text-gray-400 py-4">체크리스트 항목이 없습니다.</p>
                        ) : (
                          selectedItem.checklist.map((c) => (
                            <div key={c.id} className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 group">
                              <input
                                type="checkbox"
                                checked={!!c.checked}
                                onChange={(e) =>
                                  toggleCheckMutation.mutate({
                                    pageId: selectedPageId!,
                                    itemId: selectedItem.id,
                                    checkId: c.id,
                                    checked: e.target.checked,
                                  })
                                }
                                className="w-4 h-4 cursor-pointer accent-green-600"
                              />
                              <span className={`flex-1 text-sm ${c.checked ? 'line-through text-gray-400' : 'text-gray-700'}`}>{c.content}</span>
                              <button
                                onClick={() => deleteCheckMutation.mutate({ pageId: selectedPageId!, itemId: selectedItem.id, checkId: c.id })}
                                className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-xs px-1 transition-opacity"
                              >✕</button>
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
                        >추가</button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            {/* ─ 피그마 항목 등록/수정 폼 ─ */}
            {isEditingItem && (
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <th className={thStyle} style={{ width: 100 }}>제목 <span className="text-red-500">*</span></th>
                    <td className={tdStyle}>
                      <input type="text" value={itemFormTitle} onChange={(e) => setItemFormTitle(e.target.value)} placeholder="항목 제목" className="border rounded px-2 py-1 text-sm w-full" />
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>피그마 URL <span className="text-red-500">*</span></th>
                    <td className={tdStyle}>
                      <input type="text" value={itemFormFigmaUrl} onChange={(e) => setItemFormFigmaUrl(e.target.value)} placeholder="https://www.figma.com/design/..." className="border rounded px-2 py-1 text-sm w-full font-mono text-xs" />
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>버전</th>
                    <td className={tdStyle}>
                      <input type="text" value={itemFormVersion} onChange={(e) => setItemFormVersion(e.target.value)} placeholder="v1.0 (선택)" className="border rounded px-2 py-1 text-sm w-40" />
                    </td>
                  </tr>
                </tbody>
              </table>
            )}

            {/* ─ 빈 상태 ─ */}
            {!isEditingPage && !isEditingItem && !selectedPageId && (
              <p className="text-center text-sm text-gray-400 mt-16">화면을 선택하거나 신규 버튼을 클릭하세요.</p>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
