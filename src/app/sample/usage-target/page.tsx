'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const ShopTabs = dynamic(() => import('@/components/ShopTabs'), { ssr: false })

type Condition = {
  shopId: string
  shopName: string
  sites: Array<{ id: string; name: string }>
  corners: Array<{ id: string; name: string; siteId: string }>
  menus: Array<{ id: string; name: string; siteId: string; cornerId: string }>
}

export default function UsageTargetSamplePage() {
  const [conditions, setConditions] = useState<Condition[]>([])
  const [showJson, setShowJson] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* 페이지 헤더 */}
      <div className="bg-white rounded border mb-4">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded">Sample</span>
            <h1 className="text-lg font-bold">사용 대상 제한 옵션 설정</h1>
          </div>
        </div>
        <div className="p-4 text-sm text-gray-600 space-y-1">
          <p>점포 탭을 추가하고, 각 점포의 <strong>사이트 → 코너 → 메뉴</strong> 계층 구조로 사용 대상을 제한합니다.</p>
          <p className="text-xs text-gray-400">
            점포는 최대 10개 추가 가능. 사이트/코너/메뉴는 드롭다운 버튼으로 개별 추가하며, 계층 선택에 따라 하위 목록이 연동됩니다.
          </p>
        </div>
      </div>

      {/* 설정 UI */}
      <div className="bg-white rounded border">
        <div className="flex items-center justify-between p-3 border-b bg-gray-50">
          <span className="font-medium text-sm">점포별 사용 대상 조건</span>
          <button
            onClick={() => setShowJson((v) => !v)}
            className="px-2 py-1 text-xs border rounded text-gray-500 hover:bg-gray-100"
          >
            {showJson ? '▲ JSON 숨기기' : '▼ JSON 확인'}
          </button>
        </div>

        <div className="p-4">
          <ShopTabs conditions={conditions} onChange={setConditions} />
        </div>

        {showJson && (
          <div className="border-t">
            <div className="px-4 py-2 bg-gray-50 border-b">
              <span className="text-xs font-medium text-gray-600">현재 조건 JSON</span>
            </div>
            <pre className="p-4 text-xs text-gray-700 overflow-x-auto bg-gray-50 font-mono whitespace-pre-wrap">
              {JSON.stringify(conditions, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
