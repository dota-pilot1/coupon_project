export type ContentType = 'NOTE' | 'MMD' | 'FIGMA' | 'FILE'

export type DocFolder = {
    id: number
    name: string
    parentId: number | null
    sortOrder: number
}

export type DocBlock = {
    id?: number
    blockType: ContentType
    content: string
    sortOrder?: number
}

export type DocPost = {
    id: number
    folderId: number
    title: string
    author: string
    createdAt: string
    updatedAt: string
    blocks?: DocBlock[]
}

export const TYPE_META: Record<ContentType, { icon: string; label: string; color: string }> = {
    NOTE: { icon: '📄', label: '노트', color: 'bg-green-100 text-green-700' },
    MMD: { icon: '📊', label: 'Mermaid', color: 'bg-purple-100 text-purple-700' },
    FIGMA: { icon: '🎨', label: 'Figma', color: 'bg-pink-100 text-pink-700' },
    FILE: { icon: '📎', label: '파일 링크', color: 'bg-blue-100 text-blue-700' },
}

export type FileContent = { url: string; filename: string; description: string }

export function parseFileContent(raw: string): FileContent {
    try {
        return JSON.parse(raw)
    } catch {
        return { url: raw, filename: '', description: '' }
    }
}

export function buildTree(folders: DocFolder[]) {
    const roots: DocFolder[] = []
    const children: Record<number, DocFolder[]> = {}
    for (const f of folders) {
        if (f.parentId === null) roots.push(f)
        else {
            if (!children[f.parentId]) children[f.parentId] = []
            children[f.parentId].push(f)
        }
    }
    return { roots, children }
}
