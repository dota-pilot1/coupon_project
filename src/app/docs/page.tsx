'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'sonner'

const MermaidChart = dynamic(() => import('@/components/MermaidChart'), { ssr: false })

// ── 타입 ──────────────────────────────────────────────
type ContentType = 'NOTE' | 'MMD' | 'FIGMA' | 'FILE'

type DocFolder = {
  id: number
  name: string
  parentId: number | null
  sortOrder: number
}

type DocPost = {
  id: number
  folderId: number
  title: string
  content: string
  contentType: ContentType
  author: string
  createdAt: string
  updatedAt: string
}

const TYPE_META: Record<ContentType, { icon: string; label: string; color: string }> = {
  NOTE: { icon: '📄', label: '노트', color: 'bg-green-100 text-green-700' },
  MMD: { icon: '📊', label: 'Mermaid', color: 'bg-purple-100 text-purple-700' },
  FIGMA: { icon: '🎨', label: 'Figma', color: 'bg-pink-100 text-pink-700' },
  FILE: { icon: '📎', label: '파일 링크', color: 'bg-blue-100 text-blue-700' },
}

type FileContent = { url: string; filename: string; description: string }
function parseFileContent(raw: string): FileContent {
  try { return JSON.parse(raw) } catch { return { url: raw, filename: '', description: '' } }
}

function buildTree(folders: DocFolder[]) {
  const roots: DocFolder[] = []
  const children: Record<number, DocFolder[]> = {}
  for (const f of folders) {
    if (f.parentId === null) roots.push(f)
    else {
      if (!children[f.parentId]) children[f.parentId] = []
      children[f.parentId].push(f)
    }
  }
  return { roots, children }
}

// ── 컨텍스트 메뉴 ──────────────────────────────────────
type CtxMenu = { x: number; y: number; folderId: number; folderName: string } | null

function ContextMenu({
  menu, onClose, onAddSubFolder, onAddDoc, onRename, onDelete,
}: {
  menu: CtxMenu
  onClose: () => void
  onAddSubFolder: (parentId: number) => void
  onAddDoc: (folderId: number, type: ContentType) => void
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
      {(Object.entries(TYPE_META) as [ContentType, typeof TYPE_META[ContentType]][]).map(([type, meta]) => (
        <button key={type} className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center gap-2"
          onClick={() => { onAddDoc(menu.folderId, type); onClose() }}>
          <span>{meta.icon}</span> {meta.label} 추가
        </button>
      ))}
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

// ── 메인 ──────────────────────────────────────────────
export default function DocsPage() {
  const queryClient = useQueryClient()
  const { confirm, alert } = useConfirmDialog()

  const { data: folders = [] } = useQuery<DocFolder[]>({
    queryKey: ['docFolders'],
    queryFn: () => fetch('/api/docs/folders').then((r) => r.json()),
  })
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
  const [editContentType, setEditContentType] = useState<ContentType>('NOTE')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formFile, setFormFile] = useState<FileContent>({ url: '', filename: '', description: '' })
  const [mmdPreview, setMmdPreview] = useState(false)

  const [editingFolderId, setEditingFolderId] = useState<number | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  // 인라인 폴더 생성: parentId=null 이면 루트, number면 해당 폴더 하위
  const [inlineFolderInput, setInlineFolderInput] = useState<{ parentId: number | null } | null>(null)
  const [inlineFolderName, setInlineFolderName] = useState('')

  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null)

  const { data: posts = [] } = useQuery<DocPost[]>({
    queryKey: ['docPosts', selectedFolderId],
    queryFn: () => fetch(`/api/docs/posts?folderId=${selectedFolderId}`).then((r) => r.json()),
    enabled: !!selectedFolderId,
  })

  const { data: postDetail } = useQuery<DocPost>({
    queryKey: ['docPost', selectedPostId],
    queryFn: () => fetch(`/api/docs/posts/${selectedPostId}`).then((r) => r.json()),
    enabled: !!selectedPostId && !isEditing,
  })

  const saveMutation = useMutation({
    mutationFn: (data: { id?: number; folderId: number; title: string; content: string; contentType: ContentType }) => {
      if (data.id) {
        return fetch(`/api/docs/posts/${data.id}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
        }).then((r) => r.json())
      }
      return fetch('/api/docs/posts', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['docPosts', selectedFolderId] })
      const newId = result.id || selectedPostId
      if (newId) {
        setSelectedPostId(Number(newId))
        queryClient.invalidateQueries({ queryKey: ['docPost', Number(newId)] })
      }
      setIsEditing(false)
      toast.success('저장되었습니다.')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/docs/posts/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docPosts', selectedFolderId] })
      setSelectedPostId(null)
      setIsEditing(false)
      toast.success('삭제되었습니다.')
    },
  })

  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; parentId: number | null }) =>
      fetch('/api/docs/folders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (created: DocFolder) => {
      queryClient.invalidateQueries({ queryKey: ['docFolders'] })
      setInlineFolderInput(null)
      setInlineFolderName('')
      if (created.parentId !== null) setExpandedFolders((p) => new Set(p).add(created.parentId!))
      toast.success('폴더가 생성되었습니다.')
    },
  })

  const renameFolderMutation = useMutation({
    mutationFn: (data: { id: number; name: string }) =>
      fetch(`/api/docs/folders/${data.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: data.name }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docFolders'] })
      setEditingFolderId(null)
      toast.success('폴더명이 수정되었습니다.')
    },
  })

  const deleteFolderMutation = useMutation({
    mutationFn: (id: number) => fetch(`/api/docs/folders/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['docFolders'] })
      setSelectedFolderId(null)
      setSelectedPostId(null)
      toast.success('폴더가 삭제되었습니다.')
    },
  })

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
    setMmdPreview(false)
  }

  const openNewDoc = (folderId: number, type: ContentType) => {
    setSelectedFolderId(folderId)
    setExpandedFolders((p) => new Set(p).add(folderId))
    setSelectedPostId(null)
    setIsEditing(true)
    setEditContentType(type)
    setFormTitle('')
    setFormContent('')
    setFormFile({ url: '', filename: '', description: '' })
    setMmdPreview(false)
  }

  const handleEdit = () => {
    if (!postDetail) return
    setEditContentType(postDetail.contentType)
    setFormTitle(postDetail.title)
    if (postDetail.contentType === 'FILE') {
      setFormFile(parseFileContent(postDetail.content))
      setFormContent('')
    } else {
      setFormContent(postDetail.content)
      setFormFile({ url: '', filename: '', description: '' })
    }
    setMmdPreview(false)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!formTitle.trim()) { alert('제목을 입력하세요.', '입력 오류'); return }
    if (!selectedFolderId) return
    const content = editContentType === 'FILE' ? JSON.stringify(formFile) : formContent
    saveMutation.mutate({
      id: selectedPostId || undefined,
      folderId: selectedFolderId,
      title: formTitle,
      content,
      contentType: editContentType,
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

    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-1 py-1.5 cursor-pointer rounded text-sm transition-colors ${isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
            }`}
          style={{ paddingLeft: `${depth * 14 + 8}px`, paddingRight: '4px' }}
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
            {isSelected && posts.map((post) => {
              const meta = TYPE_META[post.contentType] ?? TYPE_META.NOTE
              return (
                <div
                  key={post.id}
                  onClick={() => handlePostClick(post)}
                  className={`flex items-center gap-1.5 py-1 cursor-pointer rounded text-sm transition-colors ${selectedPostId === post.id
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  style={{ paddingLeft: `${(depth + 1) * 14 + 8}px`, paddingRight: '8px' }}
                >
                  <span className="text-xs shrink-0">{meta.icon}</span>
                  <span className="truncate min-w-0">{post.title}</span>
                </div>
              )
            })}
          </>
        )}
      </div>
    )
  }

  const renderEditForm = () => (
    <div className="space-y-3">
      <table className="w-full border-collapse text-sm">
        <tbody>
          <tr>
            <th className={thStyle} style={{ width: '80px' }}>유형</th>
            <td className={tdStyle}>
              <div className="flex flex-wrap gap-3">
                {(Object.entries(TYPE_META) as [ContentType, typeof TYPE_META[ContentType]][]).map(([type, meta]) => (
                  <label key={type} className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" value={type} checked={editContentType === type}
                      onChange={() => { setEditContentType(type); setMmdPreview(false) }} />
                    <span>{meta.icon} {meta.label}</span>
                  </label>
                ))}
              </div>
            </td>
          </tr>
          <tr>
            <th className={thStyle}>제목 <span className="text-red-500">*</span></th>
            <td className={tdStyle}>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)}
                className="w-full border rounded px-2 py-1" placeholder="문서 제목" />
            </td>
          </tr>
        </tbody>
      </table>

      {editContentType === 'NOTE' && (
        <div className="border rounded overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b">
            <span className="text-sm font-medium text-gray-700">📄 노트 내용</span>
          </div>
          <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)}
            rows={22} className="w-full px-3 py-2 text-sm font-mono border-0 resize-y focus:outline-none"
            placeholder="마크다운 형식으로 자유롭게 작성하세요." />
        </div>
      )}

      {editContentType === 'MMD' && (
        <div className="border rounded overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">📊 Mermaid 코드</span>
            <button onClick={() => setMmdPreview((v) => !v)}
              className="text-xs px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100">
              {mmdPreview ? '편집' : '미리보기'}
            </button>
          </div>
          {mmdPreview ? (
            <div className="p-4">
              {formContent.trim()
                ? <MermaidChart chart={formContent} />
                : <p className="text-sm text-gray-400 text-center py-6">코드를 입력하면 여기에 렌더링됩니다.</p>}
            </div>
          ) : (
            <textarea value={formContent} onChange={(e) => setFormContent(e.target.value)}
              rows={22} className="w-full px-3 py-2 text-sm font-mono border-0 resize-y focus:outline-none"
              placeholder={'flowchart LR\n    A[시작] --> B[끝]'} />
          )}
        </div>
      )}

      {editContentType === 'FIGMA' && (
        <div className="border rounded overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b">
            <span className="text-sm font-medium text-gray-700">🎨 Figma URL</span>
          </div>
          <div className="p-3 space-y-2">
            <input type="url" value={formContent} onChange={(e) => setFormContent(e.target.value)}
              className="w-full border rounded px-2 py-1.5 text-sm"
              placeholder="https://www.figma.com/file/..." />
            <p className="text-xs text-gray-400">Figma 공유 링크를 입력하면 임베드로 표시됩니다.</p>
          </div>
        </div>
      )}

      {editContentType === 'FILE' && (
        <div className="border rounded overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b">
            <span className="text-sm font-medium text-gray-700">📎 파일 링크</span>
          </div>
          <div className="p-3 space-y-2">
            <div>
              <label className="block text-xs text-gray-500 mb-1">URL <span className="text-red-500">*</span></label>
              <input type="url" value={formFile.url} onChange={(e) => setFormFile((p) => ({ ...p, url: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm"
                placeholder="https://drive.google.com/... 또는 S3 URL" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">파일명</label>
              <input type="text" value={formFile.filename} onChange={(e) => setFormFile((p) => ({ ...p, filename: e.target.value }))}
                className="w-full border rounded px-2 py-1.5 text-sm" placeholder="파일명.pdf" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">설명</label>
              <textarea value={formFile.description} onChange={(e) => setFormFile((p) => ({ ...p, description: e.target.value }))}
                rows={3} className="w-full border rounded px-2 py-1.5 text-sm resize-y"
                placeholder="파일에 대한 설명을 입력하세요." />
            </div>
          </div>
        </div>
      )}
    </div>
  )

  const renderDetail = (post: DocPost) => {
    const meta = TYPE_META[post.contentType] ?? TYPE_META.NOTE
    return (
      <>
        <table className="w-full border-collapse text-sm mb-4">
          <tbody>
            <tr>
              <th className={thStyle} style={{ width: '80px' }}>유형</th>
              <td className={tdStyle}>
                <span className={`inline-block px-2 py-0.5 text-xs rounded ${meta.color}`}>
                  {meta.icon} {meta.label}
                </span>
              </td>
              <th className={thStyle} style={{ width: '60px' }}>작성자</th>
              <td className={tdStyle}>{post.author}</td>
            </tr>
            <tr>
              <th className={thStyle}>제목</th>
              <td className={tdStyle} colSpan={3}><span className="font-medium">{post.title}</span></td>
            </tr>
            <tr>
              <th className={thStyle}>작성일</th>
              <td className={tdStyle}>{post.createdAt.slice(0, 10)}</td>
              <th className={thStyle}>수정일</th>
              <td className={tdStyle}>{post.updatedAt.slice(0, 10)}</td>
            </tr>
          </tbody>
        </table>

        {post.contentType === 'NOTE' && (
          <div className="border rounded overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b">
              <span className="text-sm font-medium text-gray-700">📄 내용</span>
            </div>
            <div className="p-4">
              <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                {post.content || <span className="text-gray-400">내용이 없습니다.</span>}
              </pre>
            </div>
          </div>
        )}

        {post.contentType === 'MMD' && (
          <div className="border rounded overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b">
              <span className="text-sm font-medium text-gray-700">📊 다이어그램</span>
            </div>
            <div className="p-4">
              {post.content.trim()
                ? <MermaidChart chart={post.content} />
                : <p className="text-sm text-gray-400 text-center py-6">내용이 없습니다.</p>}
            </div>
          </div>
        )}

        {post.contentType === 'FIGMA' && (
          <div className="border rounded overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">🎨 Figma</span>
              {post.content && (
                <a href={post.content} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-500 hover:underline">새 탭에서 열기 ↗</a>
              )}
            </div>
            <div>
              {post.content.trim() ? (
                <iframe
                  src={`https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(post.content)}`}
                  className="w-full" style={{ height: '500px', border: 'none' }} allowFullScreen />
              ) : (
                <p className="text-sm text-gray-400 text-center py-6 p-4">URL이 없습니다.</p>
              )}
            </div>
          </div>
        )}

        {post.contentType === 'FILE' && (() => {
          const file = parseFileContent(post.content)
          return (
            <div className="border rounded overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b">
                <span className="text-sm font-medium text-gray-700">📎 파일 링크</span>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded border">
                  <span className="text-2xl">📎</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.filename || '파일'}</p>
                    <a href={file.url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-500 hover:underline truncate block">{file.url}</a>
                  </div>
                  <a href={file.url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 shrink-0">열기</a>
                </div>
                {file.description && (
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{file.description}</p>
                )}
              </div>
            </div>
          )
        })()}
      </>
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

          <div className="overflow-y-auto py-1" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            {roots.length === 0 && !inlineFolderInput
              ? <p className="text-xs text-gray-400 text-center py-4">+ 폴더 버튼으로 생성하세요.</p>
              : roots.map((f) => renderFolder(f))}
            {/* 루트 레벨 인라인 생성 입력 */}
            {inlineFolderInput?.parentId === null && renderInlineFolderInput(0)}
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
                    const meta = TYPE_META[post.contentType] ?? TYPE_META.NOTE
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
                  ? `${TYPE_META[editContentType]?.icon} ${selectedPostId ? '수정' : '새 문서'} — ${TYPE_META[editContentType]?.label}`
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
                    <button onClick={handleEdit} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">수정</button>
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

