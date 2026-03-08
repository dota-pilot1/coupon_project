'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type DropdownMenu = {
  label: string
  icon?: string
  items: Array<{ label: string; href: string }>
}

const PROTO_MENU: DropdownMenu = {
  label: '프로토타입',
  items: [
    { label: '쿠폰 마스터', href: '/' },
    { label: '승인 관리', href: '/approval' },
    { label: '쿠폰 발급', href: '/issuance' },
    { label: '사용 현황', href: '/usage' },
  ],
}

const REAL_MENU: DropdownMenu = {
  label: '실무 구현',
  items: [
    { label: '쿠폰 마스터 관리', href: '/real/coupon-master' },
    { label: '승인 관리', href: '/real/approval' },
    { label: '쿠폰 발행 관리', href: '/real/issuance' },
    { label: '사용 내역 조회', href: '/real/usage' },
  ],
}

const SETTING_ITEMS = [
  { label: '공통코드 관리', href: '/common-code' },
  { label: '카테고리 관리', href: '/board-category' },
]

function Dropdown({ menu, pathname, color }: { menu: DropdownMenu; pathname: string; color: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isActive = menu.items.some((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  )

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 px-4 py-2 text-sm rounded-t transition-colors ${
          isActive
            ? `${color} font-medium`
            : 'text-gray-300 hover:text-white hover:bg-gray-700'
        }`}
      >
        {menu.label}
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 mt-0 w-48 bg-white rounded-b shadow-lg border z-50">
          {menu.items.map((item) => {
            const itemActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2.5 text-sm transition-colors ${
                  itemActive
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Header() {
  const pathname = usePathname()
  const [settingOpen, setSettingOpen] = useState(false)
  const settingRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (settingRef.current && !settingRef.current.contains(e.target as Node)) setSettingOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isSettingActive = SETTING_ITEMS.some((item) => pathname.startsWith(item.href))

  return (
    <header className="bg-gray-800 text-white">
      <div className="flex items-center justify-between h-12 px-6">
        <div className="flex items-center">
          <span className="font-bold text-sm mr-8 whitespace-nowrap">CJ FNB 쿠폰관리</span>
          <nav className="flex gap-1">
            <Dropdown menu={PROTO_MENU} pathname={pathname} color="bg-blue-600 text-white" />
            <Dropdown menu={REAL_MENU} pathname={pathname} color="bg-emerald-600 text-white" />
            <Link
              href="/issue"
              className={`flex items-center px-4 py-2 text-sm rounded-t transition-colors ${
                pathname.startsWith('/issue')
                  ? 'bg-purple-600 text-white font-medium'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              이슈 관리
            </Link>
            <Link
              href="/review"
              className={`flex items-center px-4 py-2 text-sm rounded-t transition-colors ${
                pathname.startsWith('/review')
                  ? 'bg-amber-600 text-white font-medium'
                  : 'text-gray-300 hover:text-white hover:bg-gray-700'
              }`}
            >
              코드 리뷰
            </Link>
          </nav>
        </div>

        {/* 우측: 설정 */}
        <div className="relative" ref={settingRef}>
          <button
            onClick={() => setSettingOpen(!settingOpen)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${
              isSettingActive ? 'bg-gray-600 text-white' : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            설정
          </button>
          {settingOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded shadow-lg border z-50">
              {SETTING_ITEMS.map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setSettingOpen(false)}
                  className={`block px-4 py-2.5 text-sm transition-colors ${
                    pathname.startsWith(item.href) ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
