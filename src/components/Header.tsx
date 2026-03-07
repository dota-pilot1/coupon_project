'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { label: '쿠폰 마스터', href: '/' },
  { label: '승인 관리', href: '/approval' },
  { label: '쿠폰 발급', href: '/issuance' },
  { label: '사용 현황', href: '/usage' },
]

const SETTING_ITEMS = [
  { label: '공통코드 관리', href: '/common-code' },
]

export default function Header() {
  const pathname = usePathname()
  const [settingOpen, setSettingOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSettingOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const isSettingActive = SETTING_ITEMS.some((item) => pathname.startsWith(item.href))

  return (
    <header className="bg-gray-800 text-white">
      <div className="flex items-center justify-between h-12 px-6">
        <div className="flex items-center">
          <span className="font-bold text-sm mr-8 whitespace-nowrap">CJ FNB 쿠폰관리</span>
          <nav className="flex gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = item.href === '/'
                ? pathname === '/'
                : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-4 py-2 text-sm rounded-t transition-colors ${
                    isActive
                      ? 'bg-gray-50 text-gray-800 font-medium'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700'
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>

        {/* 우측: 설정 드롭다운 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setSettingOpen(!settingOpen)}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded transition-colors ${
              isSettingActive
                ? 'bg-gray-600 text-white'
                : 'text-gray-300 hover:text-white hover:bg-gray-700'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            설정
          </button>

          {settingOpen && (
            <div className="absolute right-0 mt-1 w-44 bg-white rounded shadow-lg border z-50">
              {SETTING_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setSettingOpen(false)}
                  className={`block px-4 py-2.5 text-sm transition-colors ${
                    pathname.startsWith(item.href)
                      ? 'bg-blue-50 text-blue-700 font-medium'
                      : 'text-gray-700 hover:bg-gray-100'
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
