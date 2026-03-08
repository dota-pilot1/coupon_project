'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'sonner'
import type { ColumnDefinition } from '@/components/SimpleTabulator'

const SimpleTabulator = dynamic(() => import('@/components/SimpleTabulator'), { ssr: false })
const MermaidChart = dynamic(() => import('@/components/MermaidChart'), { ssr: false })
const LexicalEditor = dynamic(
  () => import('@/components/lexical/LexicalEditor').then((m) => ({ default: m.LexicalEditor })),
  { ssr: false }
)
const LexicalViewer = dynamic(
  () => import('@/components/lexical/LexicalViewer').then((m) => ({ default: m.LexicalViewer })),
  { ssr: false }
)

type Post = {
  id: number
  category: string
  title: string
  content: string
  mmdContent: string | null
  author: string
  createdAt: string
  updatedAt: string
}

type Comment = {
  id: number
  postId: number
  content: string
  author: string
  createdAt: string
}

type Step = { id: number; stepOrder: number; title: string | null; content: string }
type StepForm = { title: string; content: string }

type PostDetail = Post & { comments: Comment[]; steps: Step[] }

type BoardCategory = { id: number; code: string; name: string }

const columns: ColumnDefinition[] = [
  { title: 'No.', field: 'rn', width: 50, hozAlign: 'center', headerSort: false },
  { title: '카테고리', field: 'categoryLabel', width: 100, hozAlign: 'center' },
  { title: '제목', field: 'title', minWidth: 150, hozAlign: 'left' },
  { title: '작성자', field: 'author', width: 70, hozAlign: 'center' },
  { title: '작성일', field: 'dateDisplay', width: 90, hozAlign: 'center' },
]

export default function ReviewPage() {
  const queryClient = useQueryClient()
  const { confirm, alert } = useConfirmDialog()

  // 검색
  const [filterCategory, setFilterCategory] = useState('ALL')
  const [searchKeyword, setSearchKeyword] = useState('')

  // 카테고리 목록
  const { data: categoryList = [] } = useQuery<BoardCategory[]>({
    queryKey: ['boardCategories'],
    queryFn: () => fetch('/api/board-categories').then((r) => r.json()),
  })
  const categoryMap = useMemo(() => Object.fromEntries(categoryList.map((c) => [c.code, c.name])), [categoryList])
  const CATEGORIES = useMemo(() => [{ value: 'ALL', label: '전체' }, ...categoryList.map((c) => ({ value: c.code, label: c.name }))], [categoryList])

  // 선택/편집
  const [selectedPostId, setSelectedPostId] = useState<number | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formCategory, setFormCategory] = useState('COMMON')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formSteps, setFormSteps] = useState<StepForm[]>([{ title: '', content: '' }])
  const [formMmd, setFormMmd] = useState('')
  const [mmdPreview, setMmdPreview] = useState(false)
  const [commentText, setCommentText] = useState('')

  // 게시글 목록
  const { data: posts = [] } = useQuery<Post[]>({
    queryKey: ['reviews', filterCategory, searchKeyword],
    queryFn: () => {
      const params = new URLSearchParams()
      if (filterCategory !== 'ALL') params.set('category', filterCategory)
      if (searchKeyword) params.set('keyword', searchKeyword)
      return fetch(`/api/reviews?${params}`).then((r) => r.json())
    },
  })

  // 게시글 상세
  const { data: postDetail } = useQuery<PostDetail>({
    queryKey: ['review', selectedPostId],
    queryFn: () => fetch(`/api/reviews/${selectedPostId}`).then((r) => r.json()),
    enabled: !!selectedPostId && !isEditing,
  })

  // 저장
  const saveMutation = useMutation({
    mutationFn: (data: { id?: number; category: string; title: string; content: string; steps: StepForm[]; mmdContent?: string | null }) => {
      if (data.id) {
        return fetch(`/api/reviews/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then((r) => r.json())
      }
      return fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      const newId = result.id || selectedPostId
      if (newId) {
        setSelectedPostId(Number(newId))
        queryClient.invalidateQueries({ queryKey: ['review', Number(newId)] })
      }
      setIsEditing(false)
      toast.success('저장되었습니다.')
    },
  })

  // 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/reviews/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] })
      handleNew()
      toast.success('삭제되었습니다.')
    },
  })

  // 댓글 추가
  const commentMutation = useMutation({
    mutationFn: (data: { postId: number; content: string }) =>
      fetch(`/api/reviews/${data.postId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: data.content }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['review', selectedPostId] })
      setCommentText('')
    },
  })

  const gridData = useMemo(() =>
    posts.map((p, i) => ({
      ...p,
      rn: i + 1,
      categoryLabel: categoryMap[p.category] || p.category,
      dateDisplay: p.createdAt.slice(0, 10),
    })),
    [posts]
  )

  const handleRowClick = (row: Record<string, unknown>) => {
    const id = row.id as number
    setSelectedPostId(id)
    setIsEditing(false)
    setCommentText('')
  }

  const handleNew = () => {
    setSelectedPostId(null)
    setIsEditing(true)
    setFormCategory('COMMON')
    setFormTitle('')
    setFormContent('')
    setFormSteps([{ title: '', content: '' }])
    setFormMmd('')
    setMmdPreview(false)
    setCommentText('')
  }

  const handleEdit = () => {
    if (!postDetail) return
    setFormCategory(postDetail.category)
    setFormTitle(postDetail.title)
    setFormContent(postDetail.content)
    setFormSteps(
      postDetail.steps?.length > 0
        ? postDetail.steps.map((s) => ({ title: s.title || '', content: s.content }))
        : [{ title: '', content: '' }]
    )
    setFormMmd(postDetail.mmdContent || '')
    setMmdPreview(false)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (!formTitle.trim()) {
      alert('제목을 입력하세요.', '입력 오류')
      return
    }
    if (formSteps.every((s) => !s.content.trim())) {
      alert('단계 내용을 하나 이상 입력하세요.', '입력 오류')
      return
    }
    if (formMmd.trim()) setMmdPreview(true)
    saveMutation.mutate({
      id: selectedPostId || undefined,
      category: formCategory,
      title: formTitle,
      content: '',
      steps: formSteps,
      mmdContent: formMmd.trim() || null,
    })
  }

  const handleDelete = async () => {
    if (!selectedPostId) return
    const ok = await confirm({
      title: '삭제 확인',
      description: '이 게시글을 삭제하시겠습니까? 댓글도 함께 삭제됩니다.',
    })
    if (ok) deleteMutation.mutate(selectedPostId)
  }

  const handleCancel = () => {
    if (selectedPostId) {
      setIsEditing(false)
    } else {
      handleNew()
    }
  }

  const handleAddComment = () => {
    if (!selectedPostId || !commentText.trim()) return
    commentMutation.mutate({ postId: selectedPostId, content: commentText })
  }

  const thStyle = 'bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal text-sm whitespace-nowrap'
  const tdStyle = 'border border-gray-200 px-3 py-1'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 타이틀 + 검색 */}
      <div className="bg-white rounded border mb-4">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <h1 className="text-lg font-bold">코드 리뷰</h1>
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
              placeholder="제목 검색"
              className="border rounded px-2 py-1 text-sm w-40"
            />
          </div>
        </div>
      </div>

      {/* 좌우 분할 */}
      <div className="flex gap-4">
        {/* 좌: 게시글 목록 */}
        <div className="w-[40%] min-w-[320px] bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">게시글 목록 ({posts.length}건)</span>
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
            selectedRowId={selectedPostId}
            placeholder="게시글이 없습니다."
          />
        </div>

        {/* 우: 상세 + 댓글 */}
        <div className="flex-1 bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">
              {isEditing ? (selectedPostId ? '게시글 수정' : '게시글 작성') : '게시글 상세'}
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
              /* 편집 모드 */
              <>
              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <th className={thStyle} style={{ width: '100px' }}>
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
                </tbody>
              </table>

              {/* MMD 다이어그램 */}
              <div className="border rounded-lg overflow-hidden mt-3">
                <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Mermaid 다이어그램</span>
                  <button
                    type="button"
                    onClick={() => setMmdPreview((v) => !v)}
                    className="text-xs px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100"
                  >
                    {mmdPreview ? '편집' : '미리보기'}
                  </button>
                </div>
                {mmdPreview ? (
                  <div className="p-3">
                    {formMmd.trim() ? <MermaidChart chart={formMmd} /> : <p className="text-sm text-gray-400 text-center py-4">MMD 내용이 없습니다.</p>}
                  </div>
                ) : (
                  <textarea
                    value={formMmd}
                    onChange={(e) => setFormMmd(e.target.value)}
                    rows={6}
                    className="w-full px-3 py-2 text-sm font-mono border-0 resize-y focus:outline-none"
                    placeholder="Mermaid 다이어그램 코드를 입력하세요 (선택사항)"
                  />
                )}
              </div>
              {/* 단계별 내용 */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">리뷰 단계 <span className="text-red-500">*</span></span>
                  <button
                    type="button"
                    onClick={() => setFormSteps((prev) => [...prev, { title: '', content: '' }])}
                    className="text-xs px-2 py-0.5 rounded border border-gray-300 bg-white hover:bg-gray-100"
                  >
                    + 단계 추가
                  </button>
                </div>
                {formSteps.map((step, idx) => (
                  <div key={idx} className="border rounded-lg overflow-hidden">
                    <div className="px-3 py-2 bg-gray-50 border-b flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-500 w-14 shrink-0">Step {idx + 1}</span>
                      <input
                        type="text"
                        value={step.title}
                        onChange={(e) => setFormSteps((prev) => prev.map((s, i) => i === idx ? { ...s, title: e.target.value } : s))}
                        className="flex-1 border rounded px-2 py-0.5 text-sm"
                        placeholder="단계 제목 (선택사항)"
                      />
                      {formSteps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setFormSteps((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-xs text-red-400 hover:text-red-600 px-1"
                        >
                          삭제
                        </button>
                      )}
                    </div>
                    <div className="border-t">
                      <LexicalEditor
                        key={`step-${idx}`}
                        initialState={step.content}
                        onChange={(val) => setFormSteps((prev) => prev.map((s, i) => i === idx ? { ...s, content: val } : s))}
                        placeholder="이 단계의 내용을 입력하세요"
                        minHeight="100px"
                      />
                    </div>
                  </div>
                ))}
              </div>
              </>
            ) : postDetail ? (
              /* 조회 모드 */
              <>
                <table className="w-full border-collapse text-sm mb-4">
                  <tbody>
                    <tr>
                      <th className={thStyle} style={{ width: '100px' }}>카테고리</th>
                      <td className={tdStyle}>
                        <span className="inline-block px-2 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                          {categoryMap[postDetail.category] || postDetail.category}
                        </span>
                      </td>
                      <th className={thStyle} style={{ width: '80px' }}>작성자</th>
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

                {/* MMD 다이어그램 */}
                {postDetail.mmdContent && (
                  <div className="border rounded-lg overflow-hidden mb-3">
                    <div className="px-3 py-2 bg-gray-50 border-b">
                      <span className="text-sm font-semibold text-gray-700">Mermaid 다이어그램</span>
                    </div>
                    <div className="p-3">
                      <MermaidChart chart={postDetail.mmdContent} />
                    </div>
                  </div>
                )}

                {/* 단계별 내용 */}
                {postDetail.steps?.length > 0 ? (
                  <div className="space-y-3 mb-4">
                    {postDetail.steps.map((step) => (
                      <div key={step.id} className="border rounded-lg overflow-hidden">
                        <div className="px-3 py-2 bg-gray-50 border-b flex items-center gap-2">
                          <span className="text-xs font-bold text-gray-500">Step {step.stepOrder}</span>
                          {step.title && <span className="text-sm font-medium text-gray-700">{step.title}</span>}
                        </div>
                        <div className="px-4 py-3 text-sm">
                          <LexicalViewer content={step.content} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : postDetail.content ? (
                  <div className="border rounded p-4 mb-4 min-h-[150px] text-sm whitespace-pre-wrap bg-gray-50">
                    {postDetail.content}
                  </div>
                ) : null}

                {/* 댓글 영역 */}
                <div className="border rounded">
                  <div className="p-3 border-b bg-gray-50 flex items-center justify-between">
                    <span className="font-medium text-sm">
                      댓글 ({postDetail.comments?.length || 0})
                    </span>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {postDetail.comments?.length > 0 ? (
                      postDetail.comments.map((c) => (
                        <div key={c.id} className="px-4 py-3 border-b last:border-b-0 text-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-gray-700">{c.author}</span>
                            <span className="text-xs text-gray-400">{c.createdAt.slice(0, 16).replace('T', ' ')}</span>
                          </div>
                          <p className="text-gray-600 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-gray-400 text-sm">
                        댓글이 없습니다.
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t flex gap-2">
                    <input
                      type="text"
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                      placeholder="댓글을 입력하세요"
                      className="flex-1 border rounded px-2 py-1 text-sm"
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!commentText.trim()}
                      className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                    >
                      등록
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-gray-400 text-sm">
                게시글을 선택하거나 [신규] 버튼을 클릭하세요.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
