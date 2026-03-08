'use client'

import { useEffect, useRef } from 'react'
import { createEditor } from 'lexical'
import { HeadingNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import { $generateHtmlFromNodes } from '@lexical/html'
import { editorTheme } from './theme'

export function LexicalViewer({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!content || !ref.current) return

    // 단순 텍스트(JSON 아님)이면 그냥 표시
    let isJson = false
    try {
      const parsed = JSON.parse(content)
      if (parsed.root) isJson = true
    } catch {
      // not json
    }

    if (!isJson) {
      if (ref.current) ref.current.innerText = content
      return
    }

    try {
      const editor = createEditor({
        namespace: 'viewer',
        theme: editorTheme,
        nodes: [HeadingNode, ListNode, ListItemNode],
        onError: () => {},
      })
      const editorState = editor.parseEditorState(content)
      editor.setEditorState(editorState)
      editor.getEditorState().read(() => {
        const html = $generateHtmlFromNodes(editor)
        if (ref.current) ref.current.innerHTML = html
      })
    } catch {
      if (ref.current) ref.current.innerText = content
    }
  }, [content])

  return <div ref={ref} className="text-sm px-1 py-1 lexical-viewer" />
}
