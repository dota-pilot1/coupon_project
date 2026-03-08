import { useCallback, useEffect, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $createParagraphNode,
  $getSelection,
  $isRangeSelection,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
} from 'lexical'
import { $setBlocksType } from '@lexical/selection'
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text'
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListNode,
} from '@lexical/list'

type BlockType = 'paragraph' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol'

const btnClass = (active: boolean) =>
  `px-1.5 py-0.5 text-xs rounded transition-colors ${
    active ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
  }`

export function BlockTypeButtons() {
  const [editor] = useLexicalComposerContext()
  const [blockType, setBlockType] = useState<BlockType>('paragraph')

  const updateState = useCallback(() => {
    editor.getEditorState().read(() => {
      const selection = $getSelection()
      if (!$isRangeSelection(selection)) return
      const anchorNode = selection.anchor.getNode()
      const element =
        anchorNode.getKey() === 'root' ? anchorNode : anchorNode.getTopLevelElementOrThrow()
      if ($isHeadingNode(element)) {
        setBlockType(element.getTag() as BlockType)
      } else if ($isListNode(element)) {
        setBlockType(element.getListType() === 'number' ? 'ol' : 'ul')
      } else {
        const parent = anchorNode.getParent()
        if (parent && $isListNode(parent)) {
          setBlockType(parent.getListType() === 'number' ? 'ol' : 'ul')
        } else {
          setBlockType('paragraph')
        }
      }
    })
  }, [editor])

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => { updateState(); return false },
      COMMAND_PRIORITY_CRITICAL,
    )
  }, [editor, updateState])

  const formatHeading = (level: 'h1' | 'h2' | 'h3') => {
    editor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        if (blockType === level) {
          $setBlocksType(selection, () => $createParagraphNode())
        } else {
          $setBlocksType(selection, () => $createHeadingNode(level))
        }
      }
    })
  }

  return (
    <>
      <button type="button" onClick={() => formatHeading('h1')} className={btnClass(blockType === 'h1')} title="Heading 1">H1</button>
      <button type="button" onClick={() => formatHeading('h2')} className={btnClass(blockType === 'h2')} title="Heading 2">H2</button>
      <button type="button" onClick={() => formatHeading('h3')} className={btnClass(blockType === 'h3')} title="Heading 3">H3</button>
      <span className="w-px h-4 bg-gray-300 mx-1" />
      <button type="button" onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} className={btnClass(blockType === 'ul')} title="Bullet List">≡</button>
      <button type="button" onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} className={btnClass(blockType === 'ol')} title="Numbered List">1.</button>
    </>
  )
}
