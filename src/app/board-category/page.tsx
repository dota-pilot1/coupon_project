'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useConfirmDialog } from '@/components/ConfirmDialog'
import { toast } from 'sonner'

type BoardCategory = {
  id: number
  code: string
  name: string
  sortOrder: number
  useYn: string
  createdAt: string
  updatedAt: string
}

const emptyForm = { code: '', name: '', sortOrder: 0, useYn: 'Y' }

export default function BoardCategoryPage() {
  const queryClient = useQueryClient()
  const { confirm, alert } = useConfirmDialog()

  const [selected, setSelected] = useState<BoardCategory | null>(null)
  const [isNew, setIsNew] = useState(false)
  const [form, setForm] = useState(emptyForm)

  const { data: categories = [] } = useQuery<BoardCategory[]>({
    queryKey: ['boardCategories', 'all'],
    queryFn: () => fetch('/api/board-categories?all=1').then((r) => r.json()),
  })

  const saveMutation = useMutation({
    mutationFn: (data: typeof emptyForm & { id?: number }) => {
      if (data.id) {
        return fetch(`/api/board-categories/${data.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        }).then((r) => r.json())
      }
      return fetch('/api/board-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json())
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardCategories'] })
      toast.success('저장되었습니다.')
      handleCancel()
    },
    onError: () => toast.error('저장에 실패했습니다.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: number) =>
      fetch(`/api/board-categories/${id}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boardCategories'] })
      toast.success('삭제되었습니다.')
      handleCancel()
    },
  })

  const handleSelect = (cat: BoardCategory) => {
    setSelected(cat)
    setIsNew(false)
    setForm({ code: cat.code, name: cat.name, sortOrder: cat.sortOrder, useYn: cat.useYn })
  }

  const handleNew = () => {
    setSelected(null)
    setIsNew(true)
    setForm(emptyForm)
  }

  const handleCancel = () => {
    setSelected(null)
    setIsNew(false)
    setForm(emptyForm)
  }

  const handleSave = () => {
    if (!form.code.trim() && !selected) {
      alert('코드를 입력하세요.', '입력 오류')
      return
    }
    if (!form.name.trim()) {
      alert('이름을 입력하세요.', '입력 오류')
      return
    }
    saveMutation.mutate(selected ? { ...form, id: selected.id } : form)
  }

  const handleDelete = async () => {
    if (!selected) return
    const ok = await confirm({ title: '삭제 확인', description: `'${selected.name}' 카테고리를 삭제하시겠습니까?` })
    if (ok) deleteMutation.mutate(selected.id)
  }

  const thStyle = 'bg-gray-50 border border-gray-200 px-3 py-2 text-left font-normal text-sm whitespace-nowrap w-24'
  const tdStyle = 'border border-gray-200 px-3 py-1.5'

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="flex gap-4">
        {/* 목록 */}
        <div className="w-80 bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">카테고리 목록 ({categories.length}건)</span>
            <button onClick={handleNew} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
              신규
            </button>
          </div>
          <div className="divide-y">
            {categories.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">카테고리가 없습니다.</p>
            ) : (
              categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleSelect(cat)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${
                    selected?.id === cat.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="flex gap-3 items-center">
                    <span className="font-mono text-xs text-gray-400 w-28 truncate">{cat.code}</span>
                    <span>{cat.name}</span>
                  </span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${cat.useYn === 'Y' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'}`}>
                    {cat.useYn === 'Y' ? '사용' : '미사용'}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* 편집 폼 */}
        <div className="flex-1 bg-white rounded border">
          <div className="flex items-center justify-between p-3 border-b bg-gray-50">
            <span className="font-medium text-sm">
              {isNew ? '카테고리 추가' : selected ? '카테고리 수정' : '카테고리 선택'}
            </span>
            <div className="flex gap-1">
              {(isNew || selected) && (
                <>
                  <button onClick={handleSave} className="px-3 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700">
                    저장
                  </button>
                  {selected && (
                    <button onClick={handleDelete} className="px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600">
                      삭제
                    </button>
                  )}
                  <button onClick={handleCancel} className="px-3 py-1 text-xs bg-gray-400 text-white rounded hover:bg-gray-500">
                    취소
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="p-4">
            {isNew || selected ? (
              <table className="border-collapse text-sm w-full max-w-md">
                <tbody>
                  {isNew && (
                    <tr>
                      <th className={thStyle}>코드 <span className="text-red-500">*</span></th>
                      <td className={tdStyle}>
                        <input
                          type="text"
                          value={form.code}
                          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                          className="border rounded px-2 py-1 text-sm w-48"
                          placeholder="예) COUPON"
                        />
                        <span className="ml-2 text-xs text-gray-400">영문 대문자, 밑줄 사용 권장</span>
                      </td>
                    </tr>
                  )}
                  {selected && (
                    <tr>
                      <th className={thStyle}>코드</th>
                      <td className={tdStyle}>
                        <span className="font-mono text-sm text-gray-500">{selected.code}</span>
                      </td>
                    </tr>
                  )}
                  <tr>
                    <th className={thStyle}>이름 <span className="text-red-500">*</span></th>
                    <td className={tdStyle}>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm w-48"
                        placeholder="예) 쿠폰"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>정렬순서</th>
                    <td className={tdStyle}>
                      <input
                        type="number"
                        value={form.sortOrder}
                        onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                        className="border rounded px-2 py-1 text-sm w-20"
                        min={0}
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className={thStyle}>사용여부</th>
                    <td className={tdStyle}>
                      <select
                        value={form.useYn}
                        onChange={(e) => setForm((f) => ({ ...f, useYn: e.target.value }))}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="Y">사용</option>
                        <option value="N">미사용</option>
                      </select>
                    </td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-sm text-gray-400 mt-8 text-center">목록에서 카테고리를 선택하거나 [신규] 버튼을 클릭하세요.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
