'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'sonner'

const MermaidChart = dynamic(() => import('@/components/MermaidChart'), { ssr: false })

import {
  type ContentType,
  type DocFolder,
  type DocBlock,
  type DocPost,
  TYPE_META,
  parseFileContent,
  parseDbTableContent,
  parseTsvToColumns,
  type DbTableContent,
  type DbColumn,
  buildTree
} from '@/entities/docs/model/types'

// ── 컨텍스트 메뉴 ──────────────────────────────────────
type CtxMenu = { x: number; y: number; folderId: number; folderName: string } | null

function ContextMenu({
  menu, onClose, onAddSubFolder, onAddDoc, onRename, onDelete,
}: {
  menu: CtxMenu
  onClose: () => void
  onAddSubFolder: (parentId: number) => void
  onAddDoc: (folderId: number) => void
  onRename: (id: number, name: string) => void
  onDelete: (id: number, name: string) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [onClose])

  if (!menu) return null

  return (
    <div
      ref={ref}
      className="fixed z-50 bg-white border rounded shadow-xl py-1 min-w-[180px] text-sm"
      style={{ top: menu.y, left: menu.x }}
    >
      <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
        onClick={() => { onAddSubFolder(menu.folderId); onClose() }}>
        <span>📁</span> 하위 폴더 추가
      </button>
      <div className="border-t my-1" />
      <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
        onClick={() => { onAddDoc(menu.folderId); onClose() }}>
        <span>📄</span> 새 문서 추가
      </button>
      <div className="border-t my-1" />
      <button className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
        onClick={() => { onRename(menu.folderId, menu.folderName); onClose() }}>
        <span>✏️</span> 이름 변경
      </button>
      <button className="w-full text-left px-3 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2"
        onClick={() => { onDelete(menu.folderId, menu.folderName); onClose() }}>
        <span>🗑️</span> 폴더 삭제
      </button>
    </div>
  )
}

import {
  useDocFolders,
  useDocPosts,
  useDocPostDetail,
  useSavePostMutation,
  useDeletePostMutation,
  useCreateFolderMutation,
  useRenameFolderMutation,
  useDeleteFolderMutation,
  useMoveFolderMutation
} from '@/entities/docs/api/queries'

// ── 폴더별 문서 목록 (개별 fetch) ──
function FolderPosts({
  folderId, depth, selectedPostId, onPostClick,
}: {
  folderId: number
  depth: number
  selectedPostId: number | null
  onPostClick: (post: DocPost) => void
}) {
  const { data: posts = [] } = useDocPosts(folderId)
  if (posts.length === 0) return null
  return (
    <>
      {posts.map((post) => {
        const primaryType = post.blocks?.[0]?.blockType ?? (post as any).contentType ?? 'NOTE'
        const meta = TYPE_META[primaryType as ContentType] ?? TYPE_META.NOTE
        return (
          <div
            key={post.id}
            onClick={() => onPostClick(post)}
            className={`flex items-center gap-1.5 py-1 cursor-pointer rounded text-sm transition-colors ${selectedPostId === post.id
              ? 'bg-blue-100 text-blue-800 font-medium'
              : 'text-gray-600 hover:bg-gray-50'
              }`}
            style={{ paddingLeft: `${depth * 14 + 8}px`, paddingRight: '8px' }}
          >
            <span className="text-xs shrink-0">{meta.icon}</span>
            <span className="truncate min-w-0">{post.title}</span>
          </div>
        )
      })}
    </>
  )
}

// ── 메인 ──────────────────────────────────────────────
export default function DocsPage() {
  const { confirm, alert } = useConfirmDialog()

  const { data: folders = [] } = useDocFolders()
  const { roots, children: folderChildren } = useMemo(() => buildTree(folders), [folders])

  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set())

  const [sidebarWidth, setSidebarWidth] = useState(250)
  const isResizing = useRef(false)

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing.current) return
      setSidebarWidth(Math.max(200, Math.min(800, e.clientX - 24)))
    }
    const handleMouseUp = () => {
      if (isResizing.current) {
        isResizing.current = false
        document.body.style.cursor = 'default'
      }
    }
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const [isEditing, setIsEditing] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [blocks, setBlocks] = useState<DocBlock[]>([])
  const [mmdPreviewRefs, setMmdPreviewRefs] = useState<Record<number, boolean>>({})

  const [editingFolderId, setEditingFolderId] = useState<number | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  // 인라인 폴더 생성: parentId=null 이면 루트, number면 해당 폴더 하위
  const [inlineFolderInput, setInlineFolderInput] = useState<{ parentId: number | null } | null>(null)
  const [inlineFolderName, setInlineFolderName] = useState('')

  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null)
  const [dragFolderId, setDragFolderId] = useState<number | null>(null)
  const [dropTargetId, setDropTargetId] = useState<number | null>(null) // null = 루트로 이동
  const [dropPosition, setDropPosition] = useState<'inside' | null>(null)

  const { data: posts = [] } = useDocPosts(selectedFolderId)
  const { data: postDetail } = useDocPostDetail(selectedPostId, isEditing)

  const saveMutation = useSavePostMutation(selectedFolderId, selectedPostId, (newId) => {
    setSelectedPostId(newId)
    setIsEditing(false)
  })

  const deleteMutation = useDeletePostMutation(selectedFolderId, () => {
    setSelectedPostId(null)
    setIsEditing(false)
  })

  const createFolderMutation = useCreateFolderMutation((parentId) => {
    setInlineFolderInput(null)
    setInlineFolderName('')
    if (parentId !== null) setExpandedFolders((p) => new Set(p).add(parentId))
  })

  const renameFolderMutation = useRenameFolderMutation(() => {
    setEditingFolderId(null)
  })

  const deleteFolderMutation = useDeleteFolderMutation(() => {
    setSelectedFolderId(null)
    setSelectedPostId(null)
  })

  const moveFolderMutation = useMoveFolderMutation()

  // 하위 폴더인지 확인 (순환 참조 방지)
  const isDescendant = (folderId: number, targetId: number): boolean => {
    const children = folderChildren[folderId] ?? []
    for (const child of children) {
      if (child.id === targetId) return true
      if (isDescendant(child.id, targetId)) return true
    }
    return false
  }

  const handleDrop = (targetFolderId: number | null) => {
    if (dragFolderId === null) return
    if (dragFolderId === targetFolderId) return
    // 자기 자신의 하위로 이동 방지
    if (targetFolderId !== null && isDescendant(dragFolderId, targetFolderId)) return
    // 이미 같은 부모면 무시
    const draggedFolder = folders.find(f => f.id === dragFolderId)
    if (draggedFolder && draggedFolder.parentId === targetFolderId) return

    moveFolderMutation.mutate({ id: dragFolderId, parentId: targetFolderId })
    if (targetFolderId !== null) {
      setExpandedFolders(prev => new Set(prev).add(targetFolderId))
    }
    setDragFolderId(null)
    setDropTargetId(null)
    setDropPosition(null)
  }

  const handleFolderClick = (id: number) => {
    setSelectedFolderId(id)
    setSelectedPostId(null)
    setIsEditing(false)
    setExpandedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handlePostClick = (post: DocPost) => {
    setSelectedPostId(post.id)
    setIsEditing(false)
    setMmdPreviewRefs({})
  }

  const openNewDoc = (folderId: number) => {
    setSelectedFolderId(folderId)
    setExpandedFolders((p) => new Set(p).add(folderId))
    setSelectedPostId(null)
    setIsEditing(true)
    setFormTitle('')
    setBlocks([{ blockType: 'NOTE', content: '' }])
    setMmdPreviewRefs({})
  }

  const handleEdit = () => {
    if (!postDetail) return
    setFormTitle(postDetail.title)
    setBlocks(postDetail.blocks?.length ? [...postDetail.blocks] : [{ blockType: 'NOTE', content: '' }])
    setMmdPreviewRefs({})
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!formTitle.trim()) { alert('제목을 입력하세요.', '입력 오류'); return }
    if (!selectedFolderId) return

    // 빈 블록 필터링 방지(필요하다면 유지) 및 순서 재조정
    const refinedBlocks = blocks.map((b, idx) => ({ ...b, sortOrder: idx }))

    saveMutation.mutate({
      id: selectedPostId || undefined,
      folderId: selectedFolderId,
      title: formTitle,
      blocks: refinedBlocks,
    })
  }

  const handleDelete = async () => {
    if (!selectedPostId) return
    const ok = await confirm({ title: '삭제 확인', description: '이 문서를 삭제하시겠습니까?' })
    if (ok) deleteMutation.mutate(selectedPostId)
  }

  const handleDeleteFolder = async (id: number, name: string) => {
    const ok = await confirm({ title: '폴더 삭제', description: `"${name}" 폴더와 하위 문서가 모두 삭제됩니다.` })
    if (ok) deleteFolderMutation.mutate(id)
  }

  const handleCreateFolder = () => {
    if (!inlineFolderName.trim()) return
    createFolderMutation.mutate({ name: inlineFolderName.trim(), parentId: inlineFolderInput?.parentId ?? null })
  }

  const openInlineFolderInput = (parentId: number | null) => {
    setInlineFolderInput({ parentId })
    setInlineFolderName('')
    if (parentId !== null) setExpandedFolders((p) => new Set(p).add(parentId))
  }

  const openCtxMenu = (e: React.MouseEvent, folder: DocFolder) => {
    e.preventDefault()
    e.stopPropagation()
    setCtxMenu({ x: e.clientX, y: e.clientY, folderId: folder.id, folderName: folder.name })
  }

  const thStyle = 'bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal text-sm whitespace-nowrap'
  const tdStyle = 'border border-gray-200 px-3 py-1 text-sm'


  // 인라인 폴더명 입력 행
  const renderInlineFolderInput = (depth: number) => (
    <div
      className="flex items-center gap-1 py-1"
      style={{ paddingLeft: `${depth * 14 + 8}px`, paddingRight: '4px' }}
    >
      <span className="text-[10px] text-gray-300 w-3 shrink-0">·</span>
      <span className="shrink-0 text-base">📁</span>
      <input
        autoFocus
        value={inlineFolderName}
        onChange={(e) => setInlineFolderName(e.target.value)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return
          if (e.key === 'Enter') handleCreateFolder()
          if (e.key === 'Escape') { setInlineFolderInput(null); setInlineFolderName('') }
        }}
        placeholder="폴더명 입력 후 Enter"
        className="flex-1 border border-blue-400 rounded px-1.5 py-0.5 text-xs min-w-0 focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  )

  // ── 트리 렌더 ──
  const renderFolder = (folder: DocFolder, depth = 0) => {
    const isSelected = selectedFolderId === folder.id
    const isExpanded = expandedFolders.has(folder.id)
    const subFolders = folderChildren[folder.id] ?? []
    const isEditingThis = editingFolderId === folder.id

    const isDragOver = dropTargetId === folder.id && dropPosition === 'inside' && dragFolderId !== folder.id

    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-1 py-1.5 cursor-pointer rounded text-sm transition-colors ${isDragOver ? 'bg-blue-100 ring-2 ring-blue-400' : isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          style={{ paddingLeft: `${depth * 14 + 8}px`, paddingRight: '4px' }}
          draggable
          onDragStart={(e) => {
            setDragFolderId(folder.id)
            e.dataTransfer.effectAllowed = 'move'
            e.dataTransfer.setData('text/plain', String(folder.id))
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (dragFolderId === folder.id) return
            if (dragFolderId !== null && isDescendant(dragFolderId, folder.id)) return
            e.dataTransfer.dropEffect = 'move'
            setDropTargetId(folder.id)
            setDropPosition('inside')
          }}
          onDragLeave={(e) => {
            e.stopPropagation()
            if (dropTargetId === folder.id) {
              setDropTargetId(null)
              setDropPosition(null)
            }
          }}
          onDrop={(e) => {
            e.preventDefault()
            e.stopPropagation()
            handleDrop(folder.id)
          }}
          onDragEnd={() => {
            setDragFolderId(null)
            setDropTargetId(null)
            setDropPosition(null)
          }}
          onClick={() => handleFolderClick(folder.id)}
          onContextMenu={(e) => openCtxMenu(e, folder)}
        >
          <span className="text-[10px] text-gray-400 w-3 shrink-0">{isExpanded ? '▼' : '▶'}</span>
          <span className="shrink-0">📁</span>
          {isEditingThis ? (
            <input
              autoFocus
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return
                if (e.key === 'Enter') renameFolderMutation.mutate({ id: folder.id, name: editingFolderName })
                if (e.key === 'Escape') setEditingFolderId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 border rounded px-1 py-0 text-xs min-w-0"
            />
          ) : (
            <span className="flex-1 truncate min-w-0">{folder.name}</span>
          )}
          {!isEditingThis && (
            <button
              className="hidden group-hover:flex items-center justify-center w-5 h-5 rounded hover:bg-gray-200 text-gray-400 shrink-0 text-xs"
              onClick={(e) => openCtxMenu(e, folder)}
              title="메뉴"
            >
              ···
            </button>
          )}
        </div>

        {isExpanded && (
          <>
            {subFolders.map((sub) => renderFolder(sub, depth + 1))}
            {/* 하위 폴더 인라인 생성 입력 */}
            {inlineFolderInput?.parentId === folder.id && renderInlineFolderInput(depth + 1)}
            <FolderPosts
              folderId={folder.id}
              depth={depth + 1}
              selectedPostId={selectedPostId}
              onPostClick={handlePostClick}
            />
          </>
        )}
      </div>
    )
  }

  const renderEditForm = () => {
    const updateBlock = (idx: number, prop: keyof DocBlock, val: string) => {
      setBlocks((prev) => prev.map((b, i) => i === idx ? { ...b, [prop]: val } : b))
    }
    const addBlock = (type: ContentType) => {
      setBlocks((prev) => [...prev, { blockType: type, content: '' }])
    }
    const removeBlock = (idx: number) => {
      setBlocks((prev) => prev.filter((_, i) => i !== idx))
    }

    return (
      <div className="space-y-4 text-sm">
        {/* 제목 설정 부분 */}
        <table className="w-full border-collapse">
          <tbody>
            <tr>
              <th className={thStyle} style={{ width: '80px' }}>제목 <span className="text-red-500">*</span></th>
              <td className={tdStyle}>
                <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border rounded px-2 py-1.5" placeholder="문서 제목" />
              </td>
            </tr>
          </tbody>
        </table>

        {/* 블록 편집 리스트 */}
        <div className="space-y-3">
          {blocks.map((block, idx) => {
            const meta = TYPE_META[block.blockType] ?? TYPE_META.NOTE
            return (
              <div key={idx} className="border rounded overflow-hidden shadow-sm relative group bg-white">
                <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400 font-bold px-1">{idx + 1}.</span>
                    <span className={`px-2 py-0.5 text-xs rounded ${meta.color}`}>{meta.icon} {meta.label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {block.blockType === 'MMD' && (
                      <button onClick={() => setMmdPreviewRefs((p) => ({ ...p, [idx]: !p[idx] }))}
                        className="text-xs px-2 py-1 rounded border border-gray-300 bg-white hover:bg-gray-100">
                        {mmdPreviewRefs[idx] ? '편집' : '미리보기'}
                      </button>
                    )}
                    <button onClick={() => removeBlock(idx)}
                      className="text-xs px-2 py-1 bg-red-50 text-red-500 hover:bg-red-100 rounded border border-red-200">
                      삭제
                    </button>
                  </div>
                </div>

                <div className="p-0">
                  {block.blockType === 'NOTE' && (
                    <textarea value={block.content} onChange={(e) => updateBlock(idx, 'content', e.target.value)}
                      rows={10} className="w-full px-3 py-2 text-sm font-mono border-0 resize-y focus:outline-none"
                      placeholder="마크다운 형식으로 자유롭게 작성하세요." />
                  )}

                  {block.blockType === 'MMD' && (
                    <>
                      {mmdPreviewRefs[idx] ? (
                        <div className="p-4 bg-white">
                          {block.content.trim()
                            ? <MermaidChart chart={block.content} />
                            : <p className="text-sm text-gray-400 text-center py-6">코드를 입력하면 렌더링됩니다.</p>}
                        </div>
                      ) : (
                        <textarea value={block.content} onChange={(e) => updateBlock(idx, 'content', e.target.value)}
                          rows={10} className="w-full px-3 py-2 text-sm font-mono border-0 resize-y focus:outline-none"
                          placeholder={'flowchart LR\n    A[시작] --> B[끝]'} />
                      )}
                    </>
                  )}

                  {block.blockType === 'FIGMA' && (
                    <div className="p-3 bg-white">
                      <input type="url" value={block.content} onChange={(e) => updateBlock(idx, 'content', e.target.value)}
                        className="w-full border rounded px-2 py-1.5 text-sm"
                        placeholder="https://www.figma.com/file/..." />
                      <p className="text-xs text-gray-400 mt-1">Figma 공유 링크 임베드 전용</p>
                    </div>
                  )}

                  {block.blockType === 'FILE' && (() => {
                    const fileObj = parseFileContent(block.content)
                    const setFileProp = (prop: string, val: string) => updateBlock(idx, 'content', JSON.stringify({ ...fileObj, [prop]: val }))
                    return (
                      <div className="p-3 space-y-2 bg-white">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">URL <span className="text-red-500">*</span></label>
                          <input type="url" value={fileObj.url} onChange={(e) => setFileProp('url', e.target.value)}
                            className="w-full border rounded px-2 py-1.5 text-sm" placeholder="https://drive.google.com/..." />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">파일명</label>
                            <input type="text" value={fileObj.filename} onChange={(e) => setFileProp('filename', e.target.value)}
                              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="파일명.pdf" />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">설명</label>
                            <input type="text" value={fileObj.description} onChange={(e) => setFileProp('description', e.target.value)}
                              className="w-full border rounded px-2 py-1.5 text-sm" placeholder="설명" />
                          </div>
                        </div>
                      </div>
                    )
                  })()}

                  {block.blockType === 'DBTABLE' && (() => {
                    const tbl = parseDbTableContent(block.content)
                    const setTblProp = (prop: keyof DbTableContent, val: string) =>
                      updateBlock(idx, 'content', JSON.stringify({ ...tbl, [prop]: val }))
                    const setColumns = (cols: DbColumn[]) =>
                      updateBlock(idx, 'content', JSON.stringify({ ...tbl, columns: cols }))

                    const updateCol = (colIdx: number, prop: keyof DbColumn, val: string | boolean | number) => {
                      const newCols = tbl.columns.map((c, i) => i === colIdx ? { ...c, [prop]: val } : c)
                      setColumns(newCols)
                    }
                    const removeCol = (colIdx: number) => {
                      setColumns(tbl.columns.filter((_, i) => i !== colIdx))
                    }
                    const addCol = () => {
                      setColumns([...tbl.columns, { no: tbl.columns.length + 1, name: '', comment: '', type: 'VARCHAR', size: '', pk: false, notNull: false, note: '' }])
                    }

                    return (
                      <div className="p-3 space-y-3 bg-white">
                        {/* 테이블 기본 정보 */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">테이블명 <span className="text-red-500">*</span></label>
                            <input type="text" value={tbl.tableName} onChange={(e) => setTblProp('tableName', e.target.value)}
                              className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="BS_CPN_COND_MENU_M" />
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">스키마</label>
                              <input type="text" value={tbl.schema} onChange={(e) => setTblProp('schema', e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm font-mono" placeholder="FSCPS" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">분류</label>
                              <input type="text" value={tbl.category} onChange={(e) => setTblProp('category', e.target.value)}
                                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="쿠폰조건-메뉴" />
                            </div>
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">테이블 설명</label>
                          <input type="text" value={tbl.description} onChange={(e) => setTblProp('description', e.target.value)}
                            className="w-full border rounded px-2 py-1.5 text-sm" placeholder="어떤 메뉴를 주문해야 쿠폰이 발동되나?" />
                        </div>

                        {/* TSV 붙여넣기 영역 */}
                        <div className="border border-dashed border-amber-300 rounded bg-amber-50 p-2">
                          <label className="block text-xs text-amber-700 mb-1 font-medium">📋 DBeaver/Excel에서 붙여넣기 (TSV)</label>
                          <textarea
                            rows={3}
                            className="w-full border rounded px-2 py-1.5 text-xs font-mono resize-y bg-white"
                            placeholder={"No\t컬럼명\t설명\t타입\t크기\tPK\tNN\t비고\n1\tCO_ID\t회사 ID\tVARCHAR\t4\tY\tY\t"}
                            onPaste={(e) => {
                              const text = e.clipboardData.getData('text/plain')
                              if (text.includes('\t')) {
                                e.preventDefault()
                                const parsed = parseTsvToColumns(text)
                                if (parsed.length > 0) {
                                  setColumns(parsed)
                                  toast.success(`${parsed.length}개 컬럼 파싱 완료`)
                                }
                              }
                            }}
                            onChange={() => { /* 직접 타이핑 무시 - 붙여넣기 전용 */ }}
                            value=""
                          />
                          <p className="text-[10px] text-amber-600 mt-1">DBeaver/Excel에서 범위 선택 후 Ctrl+C → 여기에 Ctrl+V</p>
                        </div>

                        {/* 컬럼 편집 테이블 */}
                        {tbl.columns.length > 0 && (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-100">
                                  <th className="border border-gray-300 px-2 py-1.5 w-10 text-center">No</th>
                                  <th className="border border-gray-300 px-2 py-1.5 min-w-[120px]">컬럼명</th>
                                  <th className="border border-gray-300 px-2 py-1.5 min-w-[100px]">설명</th>
                                  <th className="border border-gray-300 px-2 py-1.5 w-[90px]">타입</th>
                                  <th className="border border-gray-300 px-2 py-1.5 w-[50px]">크기</th>
                                  <th className="border border-gray-300 px-2 py-1.5 w-[35px] text-center">PK</th>
                                  <th className="border border-gray-300 px-2 py-1.5 w-[35px] text-center">NN</th>
                                  <th className="border border-gray-300 px-2 py-1.5 min-w-[120px]">비고</th>
                                  <th className="border border-gray-300 px-2 py-1.5 w-[40px]"></th>
                                </tr>
                              </thead>
                              <tbody>
                                {tbl.columns.map((col, ci) => (
                                  <tr key={ci} className="hover:bg-gray-50">
                                    <td className="border border-gray-300 px-2 py-1 text-center text-gray-500">{col.no}</td>
                                    <td className="border border-gray-300 px-1 py-0.5">
                                      <input value={col.name} onChange={(e) => updateCol(ci, 'name', e.target.value)}
                                        className="w-full px-1 py-0.5 text-xs font-mono border-0 focus:outline-none focus:bg-blue-50" />
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0.5">
                                      <input value={col.comment} onChange={(e) => updateCol(ci, 'comment', e.target.value)}
                                        className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none focus:bg-blue-50" />
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0.5">
                                      <input value={col.type} onChange={(e) => updateCol(ci, 'type', e.target.value)}
                                        className="w-full px-1 py-0.5 text-xs font-mono border-0 focus:outline-none focus:bg-blue-50" />
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0.5">
                                      <input value={col.size} onChange={(e) => updateCol(ci, 'size', e.target.value)}
                                        className="w-full px-1 py-0.5 text-xs text-center border-0 focus:outline-none focus:bg-blue-50" />
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                                      <input type="checkbox" checked={col.pk} onChange={(e) => updateCol(ci, 'pk', e.target.checked)} />
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                                      <input type="checkbox" checked={col.notNull} onChange={(e) => updateCol(ci, 'notNull', e.target.checked)} />
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0.5">
                                      <input value={col.note} onChange={(e) => updateCol(ci, 'note', e.target.value)}
                                        className="w-full px-1 py-0.5 text-xs border-0 focus:outline-none focus:bg-blue-50" />
                                    </td>
                                    <td className="border border-gray-300 px-1 py-0.5 text-center">
                                      <button onClick={() => removeCol(ci)} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <button onClick={addCol}
                              className="mt-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-dashed border-gray-300 rounded hover:bg-gray-50">
                              + 행 추가
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })()}
                </div>
              </div>
            )
          })}
        </div>

        {/* 블록 추가 버튼 영역 */}
        <div className="flex items-center gap-2 pt-2 border-t border-dashed border-gray-300">
          <span className="text-xs text-gray-500 mr-2">블록 추가:</span>
          {(Object.entries(TYPE_META) as [ContentType, typeof TYPE_META[ContentType]][]).map(([type, meta]) => (
            <button key={type} onClick={() => addBlock(type)}
              className="px-2 py-1 text-xs bg-white border border-gray-300 rounded hover:bg-gray-50 flex items-center gap-1">
              {meta.icon} {meta.label}
            </button>
          ))}
        </div>
      </div>
    )
  }

  const renderDetail = (post: DocPost) => {
    return (
      <div className="space-y-4">
        {/* 상단 기본정보 */}
        <table className="w-full border-collapse text-sm mb-6">
          <tbody>
            <tr>
              <th className={thStyle} style={{ width: '80px' }}>제목</th>
              <td className={tdStyle} colSpan={3}><span className="font-bold text-base">{post.title}</span></td>
            </tr>
            <tr>
              <th className={thStyle} style={{ width: '80px' }}>작성자</th>
              <td className={tdStyle}>{post.author}</td>
              <th className={thStyle} style={{ width: '80px' }}>등록일자</th>
              <td className={tdStyle}>{post.createdAt.slice(0, 10)}</td>
            </tr>
          </tbody>
        </table>

        {/* 블록 렌더링 목록 */}
        <div className="space-y-6">
          {(!post.blocks || post.blocks.length === 0) ? (
            <p className="text-sm text-gray-400 text-center py-6">편집 모드에서 블록을 추가하여 내용을 작성해보세요.</p>
          ) : (
            post.blocks.map((block, idx) => {
              const meta = TYPE_META[block.blockType] ?? TYPE_META.NOTE
              return (
                <div key={idx} className="border rounded shadow-sm overflow-hidden mb-4">
                  <div className="px-3 py-1.5 bg-gray-50 border-b flex items-center gap-2 text-sm text-gray-700 font-medium">
                    <span>{meta.icon}</span> {meta.label}
                  </div>

                  {block.blockType === 'NOTE' && (
                    <div className="p-4 bg-white">
                      <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                        {block.content || <span className="text-gray-400">내용이 없습니다.</span>}
                      </pre>
                    </div>
                  )}

                  {block.blockType === 'MMD' && (
                    <div className="p-4 bg-white">
                      {block.content.trim()
                        ? <MermaidChart chart={block.content} />
                        : <p className="text-sm text-gray-400 text-center py-4">다이어그램 스크립트가 비어있습니다.</p>}
                    </div>
                  )}

                  {block.blockType === 'FIGMA' && (
                    <div className="bg-white">
                      {block.content.trim() ? (
                        <iframe
                          src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(block.content)}`}
                          className="w-full" style={{ height: '500px', border: 'none' }} allowFullScreen />
                      ) : (
                        <p className="text-sm text-gray-400 text-center py-6">URL이 연결되지 않았습니다.</p>
                      )}
                    </div>
                  )}

                  {block.blockType === 'FILE' && (() => {
                    const file = parseFileContent(block.content)
                    return (
                      <div className="p-4 bg-white space-y-3">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                          <span className="text-2xl">📎</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{file.filename || '첨부파일'}</p>
                            <a href={file.url} target="_blank" rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline truncate block">{file.url}</a>
                          </div>
                          <a href={file.url} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 shrink-0 shadow-sm">
                            새 창으로 열기
                          </a>
                        </div>
                        {file.description && (
                          <p className="text-sm text-gray-600 whitespace-pre-wrap px-1">{file.description}</p>
                        )}
                      </div>
                    )
                  })()}

                  {block.blockType === 'DBTABLE' && (() => {
                    const tbl = parseDbTableContent(block.content)
                    return (
                      <div className="p-4 bg-white space-y-3">
                        {/* 테이블 헤더 */}
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="font-mono font-bold text-sm text-gray-800">{tbl.tableName || '(테이블명 없음)'}</span>
                          {tbl.schema && <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">{tbl.schema}</span>}
                          {tbl.category && <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">{tbl.category}</span>}
                        </div>
                        {tbl.description && (
                          <p className="text-sm text-gray-600 bg-gray-50 rounded px-3 py-2 border-l-3 border-amber-400">
                            💬 {tbl.description}
                          </p>
                        )}

                        {/* 컬럼 테이블 */}
                        {tbl.columns.length > 0 ? (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs border-collapse">
                              <thead>
                                <tr className="bg-gray-700 text-white">
                                  <th className="border border-gray-600 px-3 py-2 w-10 text-center">No</th>
                                  <th className="border border-gray-600 px-3 py-2 text-left">컬럼명</th>
                                  <th className="border border-gray-600 px-3 py-2 text-left">설명</th>
                                  <th className="border border-gray-600 px-3 py-2 text-left">타입</th>
                                  <th className="border border-gray-600 px-3 py-2 w-14 text-center">크기</th>
                                  <th className="border border-gray-600 px-3 py-2 w-10 text-center">PK</th>
                                  <th className="border border-gray-600 px-3 py-2 w-10 text-center">NN</th>
                                  <th className="border border-gray-600 px-3 py-2 text-left">비고</th>
                                </tr>
                              </thead>
                              <tbody>
                                {tbl.columns.map((col, ci) => (
                                  <tr key={ci} className={`${col.pk ? 'bg-amber-50' : ci % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50`}>
                                    <td className="border border-gray-200 px-3 py-1.5 text-center text-gray-500">{col.no}</td>
                                    <td className="border border-gray-200 px-3 py-1.5 font-mono font-medium text-gray-800">{col.name}</td>
                                    <td className="border border-gray-200 px-3 py-1.5 text-gray-700">{col.comment}</td>
                                    <td className="border border-gray-200 px-3 py-1.5 font-mono text-blue-700">{col.type}</td>
                                    <td className="border border-gray-200 px-3 py-1.5 text-center text-gray-600">{col.size}</td>
                                    <td className="border border-gray-200 px-3 py-1.5 text-center">{col.pk ? <span className="text-amber-600 font-bold">✓</span> : ''}</td>
                                    <td className="border border-gray-200 px-3 py-1.5 text-center">{col.notNull ? <span className="text-gray-600">✓</span> : ''}</td>
                                    <td className="border border-gray-200 px-3 py-1.5 text-gray-500 text-[11px]">{col.note}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <p className="text-[10px] text-gray-400 mt-1 text-right">{tbl.columns.length}개 컬럼</p>
                          </div>
                        ) : (
                          <p className="text-sm text-gray-400 text-center py-4">컬럼 정보가 없습니다.</p>
                        )}
                      </div>
                    )
                  })()}
                </div>
              )
            })
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <ContextMenu
        menu={ctxMenu}
        onClose={() => setCtxMenu(null)}
        onAddSubFolder={(parentId) => openInlineFolderInput(parentId)}
        onAddDoc={openNewDoc}
        onRename={(id, name) => { setEditingFolderId(id); setEditingFolderName(name) }}
        onDelete={handleDeleteFolder}
      />

      <div className="bg-white rounded border mb-4">
        <div className="p-3 border-b bg-gray-50">
          <h1 className="text-lg font-bold">문서 관리</h1>
        </div>
      </div>

      <div className="flex items-stretch" style={{ minHeight: 'calc(100vh - 120px)' }}>

        {/* ── 좌: 트리 ── */}
        <div
          className="shrink-0 bg-white rounded border flex flex-col h-full"
          style={{ width: `${sidebarWidth}px`, maxHeight: 'calc(100vh - 120px)' }}
        >
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">폴더</span>
            <button
              onClick={() => openInlineFolderInput(null)}
              className="px-2 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
            >+ 폴더</button>
          </div>

          <div
            className="overflow-y-auto py-1"
            style={{ maxHeight: 'calc(100vh - 200px)' }}
            onDragOver={(e) => {
              e.preventDefault()
              if (dragFolderId === null) return
              // 빈 영역에 드롭하면 루트로 이동
              const target = e.target as HTMLElement
              if (target === e.currentTarget) {
                e.dataTransfer.dropEffect = 'move'
                setDropTargetId(-1) // -1 = 루트 드롭 영역
                setDropPosition('inside')
              }
            }}
            onDragLeave={(e) => {
              if (e.target === e.currentTarget) {
                setDropTargetId(null)
                setDropPosition(null)
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dropTargetId === -1) {
                handleDrop(null) // null parentId = 루트로 이동
              }
            }}
          >
            {roots.length === 0 && !inlineFolderInput
              ? <p className="text-xs text-gray-400 text-center py-4">+ 폴더 버튼으로 생성하세요.</p>
              : roots.map((f) => renderFolder(f))}
            {/* 루트 레벨 인라인 생성 입력 */}
            {inlineFolderInput?.parentId === null && renderInlineFolderInput(0)}
            {/* 루트 드롭 안내 */}
            {dragFolderId !== null && (
              <div className={`mx-2 my-1 py-2 text-center text-xs rounded border-2 border-dashed transition-colors ${dropTargetId === -1 ? 'border-blue-400 bg-blue-50 text-blue-600' : 'border-gray-300 text-gray-400'}`}>
                여기에 놓으면 루트로 이동
              </div>
            )}
          </div>

          <div className="border-t p-2">
            <p className="text-[10px] text-gray-400 text-center">우클릭 또는 ··· 으로 문서 추가</p>
          </div>
        </div>

        {/* ── 크기 조절 핸들 ── */}
        <div
          className="w-4 cursor-col-resize flex flex-col justify-center items-center group z-10 mx-[-2px]"
          onMouseDown={(e) => {
            e.preventDefault()
            isResizing.current = true
            document.body.style.cursor = 'col-resize'
          }}
        >
          <div className="w-[1px] h-full bg-gray-200 group-hover:bg-blue-400 group-active:bg-blue-500 transition-colors"></div>
        </div>

        {/* ── 우: 목록 + 상세 ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4 pl-1">

          {selectedFolderId && (
            <div className="bg-white rounded border">
              <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                <span className="font-medium text-sm">
                  {folders.find((f) => f.id === selectedFolderId)?.name}
                  <span className="text-gray-400 ml-1 font-normal">({posts.length}건)</span>
                </span>
              </div>
              <div className="divide-y" style={{ maxHeight: '140px', overflowY: 'auto' }}>
                {posts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">폴더에서 우클릭 → 문서 추가</p>
                ) : (
                  posts.map((post) => {
                    const primaryType = post.blocks?.[0]?.blockType ?? (post as any).contentType ?? 'NOTE'
                    const meta = TYPE_META[primaryType as ContentType] ?? TYPE_META.NOTE
                    return (
                      <div key={post.id} onClick={() => handlePostClick(post)}
                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${selectedPostId === post.id ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
                          }`}>
                        <span>{meta.icon}</span>
                        <span className="flex-1 text-sm font-medium truncate">{post.title}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded shrink-0 ${meta.color}`}>{meta.label}</span>
                        <span className="text-xs text-gray-400 shrink-0">{post.updatedAt.slice(0, 10)}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          <div className="bg-white rounded border">
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <span className="font-medium text-sm">
                {isEditing
                  ? `📄 ${selectedPostId ? '문서 편집' : '새 문서'}`
                  : '문서 상세'}
              </span>
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <button onClick={handleSave} disabled={saveMutation.isPending}
                      className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50">저장</button>
                    <button onClick={() => setIsEditing(false)}
                      className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500">취소</button>
                  </>
                ) : selectedPostId ? (
                  <>
                    <button onClick={handleEdit} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">편집</button>
                    <button onClick={handleDelete} className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">삭제</button>
                  </>
                ) : null}
              </div>
            </div>
            <div className="p-4">
              {isEditing ? renderEditForm()
                : postDetail ? renderDetail(postDetail)
                  : (
                    <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
                      {selectedFolderId ? '폴더에서 우클릭 → 문서 추가' : '좌측에서 폴더를 선택하세요.'}
                    </div>
                  )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

