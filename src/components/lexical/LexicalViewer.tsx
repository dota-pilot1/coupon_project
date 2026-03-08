'use client'

import { useMemo, useRef, useEffect } from 'react'
import { createEditor } from 'lexical'
import { $generateHtmlFromNodes } from '@lexical/html'
import { HeadingNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { CodeNode, CodeHighlightNode } from '@lexical/code'
import { editorTheme } from './theme'

export function LexicalViewer({ content }: { content: string }) {
  const containerRef = useRef<HTMLDivElement>(null)

  const html = useMemo(() => {
    if (!content) return ''
    try {
      const editor = createEditor({
        namespace: 'viewer',
        theme: editorTheme,
        nodes: [HeadingNode, ListNode, ListItemNode, CodeNode, CodeHighlightNode],
        onError: () => {},
      })
      const state = editor.parseEditorState(content)
      let result = ''
      state.read(() => {
        result = $generateHtmlFromNodes(editor, null)
      })
      return result
    } catch {
      return `<div class="text-sm whitespace-pre-wrap">${content}</div>`
    }
  }, [content])

  // 코드 블록에 복사 버튼 추가
  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    container.querySelectorAll('code[class]').forEach((code) => {
      const pre = code.parentElement
      if (!pre || pre.tagName !== 'PRE') return
      if (pre.querySelector('.copy-btn')) return
      pre.style.position = 'relative'
      const btn = document.createElement('button')
      btn.textContent = '복사'
      btn.className = 'copy-btn absolute top-2 right-2 px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 opacity-0 transition-opacity'
      btn.addEventListener('click', () => {
        navigator.clipboard.writeText(code.textContent || '')
        btn.textContent = '복사됨 ✓'
        setTimeout(() => { btn.textContent = '복사' }, 2000)
      })
      pre.appendChild(btn)
      pre.addEventListener('mouseenter', () => { btn.style.opacity = '1' })
      pre.addEventListener('mouseleave', () => { btn.style.opacity = '0' })
    })
  }, [html])

  if (!content) return null

  return (
    <div
      ref={containerRef}
      className="lexical-viewer text-sm"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
