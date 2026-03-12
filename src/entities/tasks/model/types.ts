// Task 관리는 문서 관리와 동일한 타입을 재사용
export type { ContentType, DocBlock as TaskBlock, FileContent, DbColumn, DbTableContent } from '@/entities/docs/model/types'
export { TYPE_META, parseFileContent, parseDbTableContent, parseTsvToColumns, buildTree } from '@/entities/docs/model/types'

export type TaskFolder = {
    id: number
    name: string
    parentId: number | null
    sortOrder: number
}

export type TaskPost = {
    id: number
    folderId: number
    title: string
    author: string
    createdAt: string
    updatedAt: string
    blocks?: import('@/entities/docs/model/types').DocBlock[]
}
