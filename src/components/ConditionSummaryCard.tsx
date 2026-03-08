type Condition = {
  shopId: string
  shopName: string
  sites: Array<{ id: string; name: string }>
  corners: Array<{ id: string; name: string; siteId: string }>
  menus: Array<{ id: string; name: string; siteId: string; cornerId: string }>
}

const names = (arr: { name: string }[]) =>
  arr.length > 0 ? arr.map((x) => x.name).join(', ') : '미설정'

export function ConditionSummaryCard({ condition }: { condition: Condition }) {
  return (
    <div className="bg-white rounded border p-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-medium">
          {condition.shopId}
        </span>
        <span className="font-medium text-sm">{condition.shopName}</span>
      </div>
      <dl className="grid grid-cols-[3rem_1fr] gap-y-1 text-xs text-gray-600">
        <dt className="text-gray-400">사이트</dt>
        <dd className={condition.sites.length === 0 ? 'text-gray-300' : ''}>{names(condition.sites)}</dd>
        <dt className="text-gray-400">코너</dt>
        <dd className={condition.corners.length === 0 ? 'text-gray-300' : ''}>{names(condition.corners)}</dd>
        <dt className="text-gray-400">메뉴</dt>
        <dd className={condition.menus.length === 0 ? 'text-gray-300' : ''}>{names(condition.menus)}</dd>
      </dl>
    </div>
  )
}
