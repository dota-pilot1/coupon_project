'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'sonner'

const MermaidChart = dynamic(() => import('@/components/MermaidChart'), { ssr: false })

// ── 타입 ───────────────────────────────────────────────
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
  contentType: 'MD' | 'MMD'
  author: string
  createdAt: string
  updatedAt: string
}

// ── 유틸 ───────────────────────────────────────────────
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

// ── 컴포넌트 ───────────────────────────────────────────
export default function DocsPage() {
  const queryClient = useQueryClient()
  const { confirm, alert } = useConfirmDialog()

  // 폴더 트리 조회
  const { data: folders = [] } = useQuery<DocFolder[]>({
    queryKey: ['docFolders'],
    queryFn: () => fetch('/api/docs/folders').then((r) => r.json()),
  })

  const { roots, children: folderChildren } = useMemo(() => buildTree(folders), [folders])

  // 선택 상태
  const [selectedFolderId, setSelectedFolderId] = useState<number | null>(null)
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set())

  // 편집 상태
  const [isEditing, setIsEditing] = useState(false)
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formContentType, setFormContentType] = useState<'MD' | 'MMD'>('MD')
  const [mmdPreview, setMmdPreview] = useState(false)

  // 폴더 편집 상태
  const [editingFolderId, setEditingFolderId] = useState<number | null>(null)
  const [editingFolderName, setEditingFolderName] = useState('')
  const [newFolderParentId, setNewFolderParentId] = useState<number | null | 'NONE'>('NONE')
  const [newFolderName, setNewFolderName] = useState('')
  const [showNewFolderInput, setShowNewFolderInput] = useState(false)

  // 문서 목록 (선택한 폴더)
  const { data: posts = [] } = useQuery<DocPost[]>({
    queryKey: ['docPosts', selectedFolderId],
    queryFn: () => fetch(`/api/docs/posts?folderId=${selectedFolderId}`).then((r) => r.json()),
    enabled: !!selectedFolderId,
  })

  // 문서 상세
  const { data: postDetail } = useQuery<DocPost>({
    queryKey: ['docPost', selectedPostId],
    queryFn: () => fetch(`/api/docs/posts/${selectedPostId}`).then((r) => r.json()),
    enabled: !!selectedPostId && !isEditing,
  })

  // ── mutations ──
  const saveMutation = useMutation({
    mutationFn: (data: { id?: number; folderId: number; title: string; content: string; contentType: 'MD' | 'MMD' }) => {
      if (data.id) {
        return fetch(`/api/docs/posts/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then((r) => r.json())
      }
      return fetch('/api/docs/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (created: DocFolder) => {
      queryClient.invalidateQueries({ queryKey: ['docFolders'] })
      setShowNewFolderInput(false)
      setNewFolderName('')
      setNewFolderParentId('NONE')
      // 새 폴더가 하위 폴더라면 부모 펼치기
      if (created.parentId !== null) {
        setExpandedFolders((p) => new Set(p).add(created.parentId!))
      }
      toast.success('폴더가 생성되었습니다.')
    },
  })

  const renameFolderMutation = useMutation({
    mutationFn: (data: { id: number; name: string }) =>
      fetch(`/api/docs/folders/${data.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name }),
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
      if (selectedFolderId !== null) {
        setSelectedFolderId(null)
        setSelectedPostId(null)
      }
      toast.success('폴더가 삭제되었습니다.')
    },
  })

  // ── handlers ──
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

  const handleNew = () => {
    if (!selectedFolderId) {
      alert('먼저 폴더를 선택하세요.', '알림')
      return
    }
    setSelectedPostId(null)
    setIsEditing(true)
    setFormTitle('')
    setFormContent('')
    setFormContentType('MD')
    setMmdPreview(false)
  }

  const handleEdit = () => {
    if (!postDetail) return
    setFormTitle(postDetail.title)
    setFormContent(postDetail.content)
    setFormContentType(postDetail.contentType)
    setMmdPreview(false)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!formTitle.trim()) { alert('제목을 입력하세요.', '입력 오류'); return }
    if (!selectedFolderId) return
    saveMutation.mutate({
      id: selectedPostId || undefined,
      folderId: selectedFolderId,
      title: formTitle,
      content: formContent,
      contentType: formContentType,
    })
  }

  const handleDelete = async () => {
    if (!selectedPostId) return
    const ok = await confirm({ title: '삭제 확인', description: '이 문서를 삭제하시겠습니까?' })
    if (ok) deleteMutation.mutate(selectedPostId)
  }

  const handleDeleteFolder = async (id: number, name: string) => {
    const ok = await confirm({
      title: '폴더 삭제',
      description: `"${name}" 폴더와 하위 문서가 모두 삭제됩니다.`,
    })
    if (ok) deleteFolderMutation.mutate(id)
  }

  const handleCreateFolder = () => {
    if (!newFolderName.trim()) { alert('폴더명을 입력하세요.', '입력 오류'); return }
    createFolderMutation.mutate({
      name: newFolderName.trim(),
      parentId: newFolderParentId === 'NONE' ? null : newFolderParentId,
    })
  }

  const handleCancel = () => {
    if (selectedPostId) setIsEditing(false)
    else { setIsEditing(false) }
  }

  const thStyle = 'bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal text-sm whitespace-nowrap'
  const tdStyle = 'border border-gray-200 px-3 py-1 text-sm'

  // ── 트리 렌더 ──
  const renderFolder = (folder: DocFolder, depth = 0) => {
    const isSelected = selectedFolderId === folder.id
    const isExpanded = expandedFolders.has(folder.id)
    const subFolders = folderChildren[folder.id] ?? []
    const isEditingThis = editingFolderId === folder.id

    return (
      <div key={folder.id}>
        <div
          className={`group flex items-center gap-1 px-2 py-1.5 cursor-pointer rounded text-sm transition-colors ${
            isSelected ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-100'
          }`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => handleFolderClick(folder.id)}
        >
          <span className="text-xs mr-0.5">{isExpanded ? '▼' : '▶'}</span>
          <span className="mr-1">📁</span>
          {isEditingThis ? (
            <input
              autoFocus
              value={editingFolderName}
              onChange={(e) => setEditingFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') renameFolderMutation.mutate({ id: folder.id, name: editingFolderName })
                if (e.key === 'Escape') setEditingFolderId(null)
              }}
              onClick={(e) => e.stopPropagation()}
              className="flex-1 border rounded px-1 py-0 text-xs"
            />
          ) : (
            <span className="flex-1 truncate">{folder.name}</span>
          )}
          {/* 폴더 액션 버튼 */}
          {!isEditingThis && (
            <div className="hidden group-hover:flex items-center gap-0.5 ml-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setEditingFolderId(folder.id); setEditingFolderName(folder.name) }}
                className="text-gray-400 hover:text-blue-600 px-1 text-xs"
                title="이름 변경"
              >
                ✏️
              </button>
              <button
                onClick={() => handleDeleteFolder(folder.id, folder.name)}
                className="text-gray-400 hover:text-red-500 px-1 text-xs"
                title="삭제"
              >
                🗑️
              </button>
            </div>
          )}
        </div>

        {/* 하위 폴더 */}
        {isExpanded && subFolders.map((sub) => renderFolder(sub, depth + 1))}

        {/* 하위 문서 목록 */}
        {isExpanded && isSelected && posts.map((post) => (
          <div
            key={post.id}
            onClick={() => handlePostClick(post)}
            className={`flex items-center gap-1 px-2 py-1 cursor-pointer rounded text-sm transition-colors ${
              selectedPostId === post.id ? 'bg-blue-100 text-blue-800 font-medium' : 'text-gray-600 hover:bg-gray-50'
            }`}
            style={{ paddingLeft: `${(depth + 1) * 16 + 8}px` }}
          >
            <span className="mr-1 text-xs">{post.contentType === 'MMD' ? '📊' : '📄'}</span>
            <span className="truncate">{post.title}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="bg-white rounded border mb-4">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <h1 className="text-lg font-bold">문서 관리</h1>
        </div>
      </div>

      <div className="flex gap-4">

        {/* ── 좌: 트리 사이드바 ── */}
        <div className="w-[240px] shrink-0 bg-white rounded border flex flex-col">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">폴더</span>
            <button
              onClick={() => setShowNewFolderInput((v) => !v)}
              className="px-2 py-0.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              title="새 폴더"
            >
              + 폴더
            </button>
          </div>

          {/* 새 폴더 입력 */}
          {showNewFolderInput && (
            <div className="p-2 border-b bg-gray-50 space-y-1.5">
              <select
                value={newFolderParentId === 'NONE' ? 'NONE' : String(newFolderParentId)}
                onChange={(e) => setNewFolderParentId(e.target.value === 'NONE' ? 'NONE' : Number(e.target.value))}
                className="w-full border rounded px-2 py-1 text-xs"
              >
                <option value="NONE">최상위 폴더</option>
                {folders.map((f) => (
                  <option key={f.id} value={f.id}>└ {f.name}</option>
                ))}
              </select>
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); if (e.key === 'Escape') setShowNewFolderInput(false) }}
                placeholder="폴더명 입력"
                className="w-full border rounded px-2 py-1 text-xs"
              />
              <div className="flex gap-1">
                <button onClick={handleCreateFolder} className="flex-1 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600">
                  생성
                </button>
                <button onClick={() => setShowNewFolderInput(false)} className="flex-1 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400">
                  취소
                </button>
              </div>
            </div>
          )}

          {/* 폴더 트리 */}
          <div className="flex-1 overflow-y-auto py-1">
            {roots.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">폴더가 없습니다.<br />+ 폴더 버튼으로 생성하세요.</p>
            ) : (
              roots.map((f) => renderFolder(f))
            )}
          </div>
        </div>

        {/* ── 우: 문서 목록 + 상세 ── */}
        <div className="flex-1 min-w-0 flex flex-col gap-4">

          {/* 문서 목록 (선택 폴더) */}
          {selectedFolderId && (
            <div className="bg-white rounded border">
              <div className="flex items-center justify-between p-3 border-b bg-gray-50">
                <span className="font-medium text-sm">
                  {folders.find((f) => f.id === selectedFolderId)?.name} ({posts.length}건)
                </span>
                <button
                  onClick={handleNew}
                  className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  + 신규 문서
                </button>
              </div>
              <div className="divide-y max-h-[160px] overflow-y-auto">
                {posts.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">문서가 없습니다. [+ 신규 문서]로 작성하세요.</p>
                ) : (
                  posts.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => handlePostClick(post)}
                      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
                        selectedPostId === post.id ? 'bg-blue-50 border-l-2 border-blue-500' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">{post.contentType === 'MMD' ? '📊' : '📄'}</span>
                      <span className="flex-1 text-sm font-medium truncate">{post.title}</span>
                      <span className="text-xs text-gray-400 shrink-0">{post.updatedAt.slice(0, 10)}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* 문서 상세 / 편집 */}
          <div className="flex-1 bg-white rounded border">
            <div className="flex items-center justify-between p-3 border-b bg-gray-50">
              <span className="font-medium text-sm">
                {isEditing ? (selectedPostId ? '문서 수정' : '새 문서') : '문서 상세'}
              </span>
              <div className="flex gap-1">
                {isEditing ? (
                  <>
                    <button onClick={handleSave} disabled={saveMutation.isPending} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50">
                      저장
                    </button>
                    <button onClick={handleCancel} className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500">
                      취소
                    </button>
                  </>
                ) : selectedPostId ? (
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

            <div className="p-4">
              {isEditing ? (
                /* ── 편집 모드 ── */
                <div className="space-y-3">
                  <table className="w-full border-collapse text-sm">
                    <tbody>
                      <tr>
                        <th className={thStyle} style={{ width: '80px' }}>유형</th>
                        <td className={tdStyle}>
                          <div className="flex gap-3">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                value="MD"
                                checked={formContentType === 'MD'}
                                onChange={() => setFormContentType('MD')}
                              />
                              <span>텍스트 (MD)</span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                value="MMD"
                                checked={formContentType === 'MMD'}
                                onChange={() => setFormContentType('MMD')}
                              />
                              <span>다이어그램 (Mermaid)</span>
                            </label>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <th className={thStyle}>제목 <span className="text-red-500">*</span></th>
                        <td className={tdStyle}>
                          <input
                            type="text"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            className="w-full border rounded px-2 py-1"
                            placeholder="문서 제목을 입력하세요"
                          />
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="border rounded overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">
                        {formContentType === 'MMD' ? 'Mermaid 코드' : '내용'}
                      </span>
                      {formContentType === 'MMD' && (
                        <button
                          type="button"
                          onClick={() => setMmdPreview((v) => !v)}
                          className="text-xs px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100"
                        >
                          {mmdPreview ? '편집' : '미리보기'}
                        </button>
                      )}
                    </div>
                    {formContentType === 'MMD' && mmdPreview ? (
                      <div className="p-4">
                        {formContent.trim()
                          ? <MermaidChart chart={formContent} />
                          : <p className="text-sm text-gray-400 text-center py-4">내용을 입력하면 여기에 렌더링됩니다.</p>
                        }
                      </div>
                    ) : (
                      <textarea
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        rows={20}
                        className="w-full px-3 py-2 text-sm font-mono border-0 resize-y focus:outline-none"
                        placeholder={
                          formContentType === 'MMD'
                            ? 'flowchart LR\n    A[시작] --> B[끝]'
                            : '문서 내용을 마크다운 형식으로 입력하세요.'
                        }
                      />
                    )}
                  </div>
                </div>
              ) : postDetail ? (
                /* ── 조회 모드 ── */
                <>
                  <table className="w-full border-collapse text-sm mb-4">
                    <tbody>
                      <tr>
                        <th className={thStyle} style={{ width: '80px' }}>유형</th>
                        <td className={tdStyle}>
                          <span className={`inline-block px-2 py-0.5 text-xs rounded ${postDetail.contentType === 'MMD' ? 'bg-purple-100 text-purple-700' : 'bg-green-100 text-green-700'}`}>
                            {postDetail.contentType === 'MMD' ? '📊 Mermaid' : '📄 텍스트'}
                          </span>
                        </td>
                        <th className={thStyle} style={{ width: '60px' }}>작성자</th>
                        <td className={tdStyle}>{postDetail.author}</td>
                      </tr>
                      <tr>
                        <th className={thStyle}>제목</th>
                        <td className={tdStyle} colSpan={3}>
                          <span className="font-medium">{postDetail.title}</span>
                        </td>
                      </tr>
                      <tr>
                        <th className={thStyle}>작성일</th>
                        <td className={tdStyle}>{postDetail.createdAt.slice(0, 10)}</td>
                        <th className={thStyle}>수정일</th>
                        <td className={tdStyle}>{postDetail.updatedAt.slice(0, 10)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="border rounded overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b">
                      <span className="text-sm font-medium text-gray-700">내용</span>
                    </div>
                    <div className="p-4">
                      {postDetail.contentType === 'MMD' ? (
                        postDetail.content.trim()
                          ? <MermaidChart chart={postDetail.content} />
                          : <p className="text-sm text-gray-400 text-center py-4">내용이 없습니다.</p>
                      ) : (
                        <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">{postDetail.content}</pre>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
                  {selectedFolderId
                    ? '문서를 선택하거나 [+ 신규 문서]를 클릭하세요.'
                    : '좌측에서 폴더를 선택하세요.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
