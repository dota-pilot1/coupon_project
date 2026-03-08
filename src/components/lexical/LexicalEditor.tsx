'use client'

import { useCallback, useEffect, useRef } from 'react'
import { LexicalComposer } from '@lexical/react/LexicalComposer'
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin'
import { ContentEditable } from '@lexical/react/LexicalContentEditable'
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary'
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin'
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin'
import { ListPlugin } from '@lexical/react/LexicalListPlugin'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import { HeadingNode } from '@lexical/rich-text'
import { ListNode, ListItemNode } from '@lexical/list'
import {
  $createParagraphNode,
  $createTextNode,
  $getRoot,
  type EditorState,
} from 'lexical'
import { editorTheme } from './theme'
import { ToolbarPlugin } from './toolbar/ToolbarPlugin'

interface LexicalEditorProps {
  initialState?: string
  onChange: (state: string) => void
  placeholder?: string
  minHeight?: string
}

function InitialContentPlugin({ initialState }: { initialState?: string }) {
  const [editor] = useLexicalComposerContext()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (!initialState) return

    try {
      const parsed = JSON.parse(initialState)
      if (parsed.root) {
        const editorState = editor.parseEditorState(initialState)
        editor.setEditorState(editorState)
        return
      }
    } catch {
      // 단순 텍스트
    }

    editor.update(() => {
      const root = $getRoot()
      root.clear()
      for (const line of initialState.split('\n')) {
        const paragraph = $createParagraphNode()
        if (line) paragraph.append($createTextNode(line))
        root.append(paragraph)
      }
    })
  }, [editor, initialState])

  return null
}

export function LexicalEditor({
  initialState,
  onChange,
  placeholder = '내용을 입력하세요...',
  minHeight = '120px',
}: LexicalEditorProps) {
  const handleChange = useCallback(
    (editorState: EditorState) => {
      onChange(JSON.stringify(editorState.toJSON()))
    },
    [onChange],
  )

  const initialConfig = {
    namespace: 'ReviewEditor',
    theme: editorTheme,
    nodes: [HeadingNode, ListNode, ListItemNode],
    onError: (error: Error) => console.error('Lexical error:', error),
  }

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="flex flex-col">
        <ToolbarPlugin />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className="p-3 text-sm outline-none"
                style={{ minHeight }}
              />
            }
            placeholder={
              <div className="absolute top-3 left-3 text-sm text-gray-400 pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin onChange={handleChange} />
        <InitialContentPlugin initialState={initialState} />
      </div>
    </LexicalComposer>
  )
}
