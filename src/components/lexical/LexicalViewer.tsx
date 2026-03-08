'use client'

import { useState } from 'react'

type LexicalNode = {
  type: string
  children?: LexicalNode[]
  text?: string
  format?: number
  language?: string
  tag?: string
  listType?: string
}

function getTextContent(node: LexicalNode): string {
  if (node.text !== undefined) return node.text
  return (node.children || []).map(getTextContent).join('')
}

function CopyCodeBlock({ node }: { node: LexicalNode }) {
  const [copied, setCopied] = useState(false)
  const text = getTextContent(node)
  const handleCopy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="relative group my-2">
      <pre className="bg-gray-900 text-gray-100 rounded p-4 text-sm font-mono overflow-x-auto whitespace-pre">
        <code>{text}</code>
      </pre>
      <button
        onClick={handleCopy}
        className="absolute top-2 right-2 px-2 py-0.5 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? '복사됨 ✓' : '복사'}
      </button>
    </div>
  )
}

function renderText(node: LexicalNode, idx: number): React.ReactNode {
  let el: React.ReactNode = node.text || ''
  const fmt = node.format || 0
  if (fmt & 1) el = <strong>{el}</strong>
  if (fmt & 2) el = <em>{el}</em>
  if (fmt & 8) el = <u>{el}</u>
  if (fmt & 4) el = <s>{el}</s>
  if (fmt & 16) el = <code className="bg-gray-100 font-mono text-xs px-1 py-0.5 rounded">{el}</code>
  return <span key={idx}>{el}</span>
}

function renderNode(node: LexicalNode, idx: number): React.ReactNode {
  switch (node.type) {
    case 'root':
      return <>{node.children?.map((c, i) => renderNode(c, i))}</>
    case 'paragraph':
      return <p key={idx} className="mb-1 text-sm">{node.children?.map((c, i) => renderNode(c, i))}</p>
    case 'heading': {
      const cls: Record<string, string> = { h1: 'text-2xl font-bold mb-2', h2: 'text-xl font-bold mb-2', h3: 'text-lg font-semibold mb-1' }
      return <div key={idx} className={cls[node.tag || 'h3'] || 'font-bold mb-1'}>{node.children?.map((c, i) => renderNode(c, i))}</div>
    }
    case 'code':
      return <CopyCodeBlock key={idx} node={node} />
    case 'code-highlight':
      return <span key={idx}>{node.text}</span>
    case 'list': {
      const items = node.children?.map((c, i) => renderNode(c, i))
      return node.listType === 'number'
        ? <ol key={idx} className="list-decimal ml-4 mb-2 text-sm">{items}</ol>
        : <ul key={idx} className="list-disc ml-4 mb-2 text-sm">{items}</ul>
    }
    case 'listitem':
      return <li key={idx} className="mb-0.5">{node.children?.map((c, i) => renderNode(c, i))}</li>
    case 'text':
      return renderText(node, idx)
    case 'linebreak':
      return <br key={idx} />
    default:
      return <span key={idx}>{node.children?.map((c, i) => renderNode(c, i))}</span>
  }
}

export function LexicalViewer({ content }: { content: string }) {
  if (!content) return null
  try {
    const parsed = JSON.parse(content)
    if (!parsed.root) throw new Error()
    return <div className="lexical-viewer">{renderNode(parsed.root, 0)}</div>
  } catch {
    return <div className="text-sm whitespace-pre-wrap">{content}</div>
  }
}
