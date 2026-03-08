import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from 'lexical'
import { $createCodeNode, $isCodeNode } from '@lexical/code'
import { $setBlocksType } from '@lexical/selection'

const btnClass = (active: boolean) =>
  `px-1.5 py-0.5 text-xs rounded transition-colors font-mono ${
    active ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
  }`

export function CodeBlockButton() {
  const [editor] = useLexicalComposerContext()
  const [isCode, setIsCode] = useState(false)

  const updateState = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const anchorNode = selection.anchor.getNode()
      const element =
        anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow()
      setIsCode($isCodeNode(element))
    })
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => { updateState(); return false },
      COMMAND_PRIORITY_CRITICAL,
    )
  }, [editor, updateState])

  const toggle = () => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (isCode) {
          $setBlocksType(selection, () => $createParagraphNode())
        } else {
          $setBlocksType(selection, () => $createCodeNode())
        }
      }
    })
  }

  return (
    <button type="button" onClick={toggle} className={btnClass(isCode)} title="코드 블록">
      {'</>'}
    </button>
  )
}
