'use client'

import { useState } from 'react'
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

  const addSite = (site: Site) => {
    if (condition.sites.find((s) => s.id === site.id)) return
    onChange({ ...condition, sites: [...condition.sites, site] })
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

  const addCorner = (corner: Corner) => {
    if (condition.corners.find((c) => c.id === corner.id)) return
    onChange({
      ...condition,
      corners: [...condition.corners, { ...corner, siteId: selectedSite! }],
    })
  }

  const removeCorner = (cornerId: string) => {
    onChange({
      ...condition,
      corners: condition.corners.filter((c) => c.id !== cornerId),
      menus: condition.menus.filter((m) => m.cornerId !== cornerId),
    })
    if (selectedCorner === cornerId) setSelectedCorner(null)
  }

  const addMenu = (menu: Menu) => {
    if (condition.menus.find((m) => m.id === menu.id)) return
    onChange({
      ...condition,
      menus: [
        ...condition.menus,
        { ...menu, siteId: selectedSite!, cornerId: selectedCorner! },
      ],
    })
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
          <Dropdown
            items={unaddedSites}
            onSelect={addSite}
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
          <Dropdown
            items={unaddedCorners}
            onSelect={addCorner}
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
          <Dropdown
            items={unaddedMenus}
            onSelect={addMenu}
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

// 간단한 드롭다운 추가 버튼
function Dropdown<T extends { id: string; name: string }>({
  items,
  onSelect,
  label,
  disabled,
}: {
  items: T[]
  onSelect: (item: T) => void
  label: string
  disabled: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen(!open)}
        disabled={disabled}
        className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        {label}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-7 z-20 bg-white border rounded shadow-lg w-48 max-h-40 overflow-y-auto">
            {items.length > 0 ? (
              items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelect(item)
                    setOpen(false)
                  }}
                  className="px-3 py-2 text-xs hover:bg-blue-50 cursor-pointer"
                >
                  <span className="text-gray-400 mr-1">{item.id}</span>
                  {item.name}
                </div>
              ))
            ) : (
              <div className="p-3 text-xs text-gray-400 text-center">
                추가 가능한 항목 없음
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
