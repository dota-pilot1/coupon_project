'use client'

import { useEffect, useRef, useState } from 'react'

export default function MermaidChart({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!ref.current || !chart.trim()) return

    const render = async () => {
      try {
        setError(null)
        const mermaid = (await import('mermaid')).default
        mermaid.initialize({ startOnLoad: false, theme: 'default', securityLevel: 'loose' })

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const { svg } = await mermaid.render(id, chart)
        if (ref.current) ref.current.innerHTML = svg
      } catch (e) {
        setError(e instanceof Error ? e.message : '다이어그램 렌더링 오류')
        if (ref.current) ref.current.innerHTML = ''
      }
    }

    render()
  }, [chart])

  if (error) {
    return (
      <div className="text-xs text-red-500 bg-red-50 border border-red-200 rounded p-3">
        <p className="font-semibold mb-1">문법 오류</p>
        <pre className="whitespace-pre-wrap">{error}</pre>
      </div>
    )
  }

  return <div ref={ref} className="flex justify-center overflow-auto" />
}
