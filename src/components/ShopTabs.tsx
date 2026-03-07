'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import ConditionGrids from './ConditionGrids'

type Shop = { id: string; name: string }

type Condition = {
  shopId: string
  shopName: string
  sites: Array<{ id: string; name: string }>
  corners: Array<{ id: string; name: string; siteId: string }>
  menus: Array<{ id: string; name: string; siteId: string; cornerId: string }>
}

type Props = {
  conditions: Condition[]
  onChange: (conditions: Condition[]) => void
}

const MAX_TABS = 10

export default function ShopTabs({ conditions, onChange }: Props) {
  const [activeTab, setActiveTab] = useState(0)
  const [showShopPopup, setShowShopPopup] = useState(false)

  const { data: allShops = [] } = useQuery<Shop[]>({
    queryKey: ['shops'],
    queryFn: () => fetch('/api/shops').then((r) => r.json()),
  })

  const addShopTab = (shop: Shop) => {
    if (conditions.find((c) => c.shopId === shop.id)) {
      alert('이미 추가된 점포입니다.')
      return
    }
    if (conditions.length >= MAX_TABS) {
      alert(`점포는 최대 ${MAX_TABS}개까지 추가 가능합니다.`)
      return
    }
    const newConditions = [
      ...conditions,
      { shopId: shop.id, shopName: shop.name, sites: [], corners: [], menus: [] },
    ]
    onChange(newConditions)
    setActiveTab(newConditions.length - 1)
    setShowShopPopup(false)
  }

  const removeShopTab = (index: number) => {
    if (!confirm(`"${conditions[index].shopName}" 점포 조건을 삭제하시겠습니까?`)) return
    const newConditions = conditions.filter((_, i) => i !== index)
    onChange(newConditions)
    if (activeTab >= newConditions.length) {
      setActiveTab(Math.max(0, newConditions.length - 1))
    }
  }

  const updateCondition = (index: number, updated: Condition) => {
    const newConditions = [...conditions]
    newConditions[index] = updated
    onChange(newConditions)
  }

  // 추가 안 된 점포만 필터
  const availableShops = allShops.filter(
    (s) => !conditions.find((c) => c.shopId === s.id)
  )

  return (
    <div>
      {/* 탭 헤더 */}
      <div className="flex items-center border-b">
        {conditions.map((cond, i) => (
          <div
            key={cond.shopId}
            onClick={() => setActiveTab(i)}
            className={`relative group flex items-center gap-1 px-4 py-2 text-sm cursor-pointer border-t border-l border-r rounded-t -mb-px ${
              activeTab === i
                ? 'bg-white border-gray-300 font-medium'
                : 'bg-gray-100 border-transparent hover:bg-gray-200'
            }`}
          >
            <span>{cond.shopName}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeShopTab(i)
              }}
              className="ml-1 text-gray-400 hover:text-red-500 text-xs"
              title="점포 삭제"
            >
              x
            </button>
          </div>
        ))}
        <button
          onClick={() => setShowShopPopup(true)}
          className="px-3 py-2 text-sm text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-t"
          title="점포 추가"
        >
          + 점포 추가
        </button>
      </div>

      {/* 탭 컨텐츠 */}
      {conditions.length > 0 && conditions[activeTab] ? (
        <div className="border border-t-0 rounded-b p-4">
          <ConditionGrids
            key={conditions[activeTab].shopId}
            condition={conditions[activeTab]}
            onChange={(updated) => updateCondition(activeTab, updated)}
          />
        </div>
      ) : (
        <div className="border border-t-0 rounded-b p-8 text-center text-gray-400 text-sm">
          [+ 점포 추가] 버튼으로 점포를 추가하세요.
        </div>
      )}

      {/* 점포 선택 팝업 */}
      {showShopPopup && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-80">
            <div className="flex items-center justify-between p-3 border-b">
              <span className="font-medium text-sm">점포 선택</span>
              <button
                onClick={() => setShowShopPopup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                x
              </button>
            </div>
            <div className="p-2 max-h-60 overflow-y-auto">
              {availableShops.length > 0 ? (
                availableShops.map((shop) => (
                  <div
                    key={shop.id}
                    onClick={() => addShopTab(shop)}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer rounded text-sm"
                  >
                    <span className="text-gray-500 mr-2">{shop.id}</span>
                    {shop.name}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-400 text-sm">
                  추가 가능한 점포가 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
