'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'

type Site = { id: string; name: string }
type Corner = { id: string; name: string; siteId: string }
type Menu = { id: string; name: string; siteId: string; cornerId: string }

type Condition = {
  shopId: string
  shopName: string
  sites: Site[]
  corners: Corner[]
  menus: Menu[]
}

type Props = {
  condition: Condition
  onChange: (updated: Condition) => void
}

export default function ConditionGrids({ condition, onChange }: Props) {
  const [selectedSite, setSelectedSite] = useState<string | null>(null)
  const [selectedCorner, setSelectedCorner] = useState<string | null>(null)

  // 점포 전환 시 첫 번째 사이트 자동 선택
  useEffect(() => {
    setSelectedSite(condition.sites[0]?.id ?? null)
    setSelectedCorner(null)
  }, [condition.shopId])

  // 해당 점포의 사이트 목록
  const { data: availableSites = [] } = useQuery<Site[]>({
    queryKey: ['sites', condition.shopId],
    queryFn: () =>
      fetch(`/api/shops/${condition.shopId}/sites`).then((r) => r.json()),
  })

  // 선택된 사이트의 코너 목록
  const { data: availableCorners = [] } = useQuery<Corner[]>({
    queryKey: ['corners', condition.shopId, selectedSite],
    queryFn: () =>
      fetch(
        `/api/shops/${condition.shopId}/sites/${selectedSite}/corners`
      ).then((r) => r.json()),
    enabled: !!selectedSite,
  })

  // 선택된 코너의 메뉴 목록
  const { data: availableMenus = [] } = useQuery<Menu[]>({
    queryKey: ['menus', condition.shopId, selectedSite, selectedCorner],
    queryFn: () =>
      fetch(
        `/api/shops/${condition.shopId}/sites/${selectedSite}/corners/${selectedCorner}/menus`
      ).then((r) => r.json()),
    enabled: !!selectedSite && !!selectedCorner,
  })

  const addSites = (sites: Site[]) => {
    const newSites = sites.filter((s) => !condition.sites.find((cs) => cs.id === s.id))
    onChange({ ...condition, sites: [...condition.sites, ...newSites] })
  }

  const removeSite = (siteId: string) => {
    onChange({
      ...condition,
      sites: condition.sites.filter((s) => s.id !== siteId),
      corners: condition.corners.filter((c) => c.siteId !== siteId),
      menus: condition.menus.filter((m) => m.siteId !== siteId),
    })
    if (selectedSite === siteId) {
      setSelectedSite(null)
      setSelectedCorner(null)
    }
  }

  const addCorners = (corners: Corner[]) => {
    const newCorners = corners
      .filter((c) => !condition.corners.find((cc) => cc.id === c.id))
      .map((c) => ({ ...c, siteId: selectedSite! }))
    onChange({ ...condition, corners: [...condition.corners, ...newCorners] })
  }

  const removeCorner = (cornerId: string) => {
    onChange({
      ...condition,
      corners: condition.corners.filter((c) => c.id !== cornerId),
      menus: condition.menus.filter((m) => m.cornerId !== cornerId),
    })
    if (selectedCorner === cornerId) setSelectedCorner(null)
  }

  const addMenus = (menus: Menu[]) => {
    const newMenus = menus
      .filter((m) => !condition.menus.find((cm) => cm.id === m.id))
      .map((m) => ({ ...m, siteId: selectedSite!, cornerId: selectedCorner! }))
    onChange({ ...condition, menus: [...condition.menus, ...newMenus] })
  }

  const removeMenu = (menuId: string) => {
    onChange({
      ...condition,
      menus: condition.menus.filter((m) => m.id !== menuId),
    })
  }

  // 필터링: 선택된 사이트/코너에 따라 표시
  const filteredCorners = selectedSite
    ? condition.corners.filter((c) => c.siteId === selectedSite)
    : condition.corners

  const filteredMenus = selectedCorner
    ? condition.menus.filter((m) => m.cornerId === selectedCorner)
    : selectedSite
    ? condition.menus.filter((m) => m.siteId === selectedSite)
    : condition.menus

  // 팝업용: 아직 추가 안 된 항목만
  const unaddedSites = availableSites.filter(
    (s) => !condition.sites.find((cs) => cs.id === s.id)
  )
  const unaddedCorners = availableCorners.filter(
    (c) => !condition.corners.find((cc) => cc.id === c.id)
  )
  const unaddedMenus = availableMenus.filter(
    (m) => !condition.menus.find((cm) => cm.id === m.id)
  )

  return (
    <div className="flex gap-3">
      {/* 사이트 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">사이트</span>
          <MultiSelectPopup
            items={unaddedSites}
            onConfirm={addSites}
            label="추가"
            disabled={false}
          />
        </div>
        <div className="border rounded min-h-[200px] bg-gray-50">
          {condition.sites.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs">
              데이터 없음
            </div>
          ) : (
            condition.sites.map((site) => (
              <div
                key={site.id}
                onClick={() => {
                  // 사이트 클릭시 선택/해제, 선택된 사이트에 대해 재조회
                  setSelectedSite(site.id === selectedSite ? null : site.id)
                  
                  setSelectedCorner(null)
                }}
                className={`flex items-center justify-between px-3 py-2 text-xs border-b cursor-pointer ${
                  selectedSite === site.id
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span>
                  <span className="text-gray-400 mr-1">{site.id}</span>
                  {site.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeSite(site.id)
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  x
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 코너 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">코너</span>
          <MultiSelectPopup
            items={unaddedCorners}
            onConfirm={addCorners}
            label="추가"
            disabled={!selectedSite}
          />
        </div>
        <div className="border rounded min-h-[200px] bg-gray-50">
          {filteredCorners.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs">
              {selectedSite ? '데이터 없음' : '사이트를 선택하세요'}
            </div>
          ) : (
            filteredCorners.map((corner) => (
              <div
                key={corner.id}
                onClick={() =>
                  setSelectedCorner(
                    corner.id === selectedCorner ? null : corner.id
                  )
                }
                className={`flex items-center justify-between px-3 py-2 text-xs border-b cursor-pointer ${
                  selectedCorner === corner.id
                    ? 'bg-blue-100'
                    : 'hover:bg-gray-100'
                }`}
              >
                <span>
                  <span className="text-gray-400 mr-1">{corner.id}</span>
                  {corner.name}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    removeCorner(corner.id)
                  }}
                  className="text-gray-400 hover:text-red-500"
                >
                  x
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* 메뉴 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-600">메뉴</span>
          <MultiSelectPopup
            items={unaddedMenus}
            onConfirm={addMenus}
            label="추가"
            disabled={!selectedCorner}
          />
        </div>
        <div className="border rounded min-h-[200px] bg-gray-50">
          {filteredMenus.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-xs">
              {selectedCorner ? '데이터 없음' : '코너를 선택하세요'}
            </div>
          ) : (
            filteredMenus.map((menu) => (
              <div
                key={menu.id}
                className="flex items-center justify-between px-3 py-2 text-xs border-b hover:bg-gray-100"
              >
                <span>
                  <span className="text-gray-400 mr-1">{menu.id}</span>
                  {menu.name}
                </span>
                <button
                  onClick={() => removeMenu(menu.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  x
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// 멀티셀렉트 팝업 추가 버튼
function MultiSelectPopup<T extends { id: string; name: string }>({
  items,
  onConfirm,
  label,
  disabled,
}: {
  items: T[]
  onConfirm: (items: T[]) => void
  label: string
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  const handleOpen = () => {
    if (disabled) return
    setChecked(new Set())
    setSearch('')
    setOpen(true)
  }

  const filtered = items.filter(
    (i) => i.id.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase())
  )

  const toggleAll = () => {
    if (filtered.every((i) => checked.has(i.id)))
      setChecked((prev) => { const next = new Set(prev); filtered.forEach((i) => next.delete(i.id)); return next })
    else
      setChecked((prev) => { const next = new Set(prev); filtered.forEach((i) => next.add(i.id)); return next })
  }

  const toggle = (id: string) => {
    const next = new Set(checked)
    next.has(id) ? next.delete(id) : next.add(id)
    setChecked(next)
  }

  const handleConfirm = () => {
    onConfirm(items.filter((i) => checked.has(i.id)))
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        disabled={disabled}
        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="fixed inset-0 z-20 flex items-center justify-center pointer-events-none">
            <div
              className="bg-white rounded shadow-xl border w-[480px] pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between px-4 py-3 border-b">
                <span className="text-sm font-medium">항목 선택</span>
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>
              {/* 검색 */}
              <div className="px-4 py-3 border-b">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ID 또는 이름으로 검색"
                  className="w-full px-3 py-1.5 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                  autoFocus
                />
              </div>
              {/* 테이블 */}
              <div className="overflow-y-auto" style={{ maxHeight: '320px' }}>
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-10 px-4 py-2 text-left">
                        <input
                          type="checkbox"
                          onChange={toggleAll}
                          checked={filtered.length > 0 && filtered.every((i) => checked.has(i.id))}
                          readOnly={false}
                        />
                      </th>
                      <th className="px-4 py-2 text-left text-gray-500 font-medium">ID</th>
                      <th className="px-4 py-2 text-left text-gray-500 font-medium">이름</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length > 0 ? (
                      filtered.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => toggle(item.id)}
                          className={`cursor-pointer border-t ${checked.has(item.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                        >
                          <td className="w-10 px-4 py-2">
                            <input type="checkbox" readOnly checked={checked.has(item.id)} className="pointer-events-none" />
                          </td>
                          <td className="px-4 py-2 text-gray-400">{item.id}</td>
                          <td className="px-4 py-2">{item.name}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-8 text-center text-gray-400">
                          {search ? '검색 결과 없음' : '추가 가능한 항목 없음'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {/* 푸터 */}
              <div className="flex items-center justify-between px-4 py-3 border-t">
                <span className="text-xs text-gray-400">{checked.size}개 선택됨</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOpen(false)}
                    className="px-3 py-1.5 text-xs border rounded hover:bg-gray-50"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={checked.size === 0}
                    className="px-3 py-1.5 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    확인 {checked.size > 0 && `(${checked.size})`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
