export type ContentType = 'NOTE' | 'MMD' | 'FIGMA' | 'FILE' | 'DBTABLE'

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
    DBTABLE: { icon: '🗃️', label: 'DB 테이블', color: 'bg-amber-100 text-amber-700' },
}

export type FileContent = { url: string; filename: string; description: string }

export function parseFileContent(raw: string): FileContent {
    try {
        return JSON.parse(raw)
    } catch {
        return { url: raw, filename: '', description: '' }
    }
}

// ── DB 테이블 블록 타입 ──
export type DbColumn = {
    no: number
    name: string
    comment: string
    type: string
    size: number | string
    pk: boolean
    notNull: boolean
    note: string
}

export type DbTableContent = {
    tableName: string
    schema: string
    category: string
    description: string
    columns: DbColumn[]
}

export function parseDbTableContent(raw: string): DbTableContent {
    try {
        return JSON.parse(raw)
    } catch {
        return { tableName: '', schema: '', category: '', description: '', columns: [] }
    }
}

/** TSV(탭 구분) 텍스트를 DbColumn[] 로 변환 - DBeaver/Excel/Sheets 붙여넣기용 */
export function parseTsvToColumns(tsv: string): DbColumn[] {
    const lines = tsv.trim().split('\n').filter(Boolean)
    if (lines.length === 0) return []

    const rows = lines.map(line => line.split('\t').map(c => c.trim()))

    // 첫 행이 헤더인지 판별 (숫자가 아니면 헤더)
    const firstCell = rows[0][0]?.toLowerCase()
    const hasHeader = isNaN(Number(firstCell)) || ['no', 'no.', '#', '번호', 'seq'].includes(firstCell)
    const dataRows = hasHeader ? rows.slice(1) : rows

    // 유효한 DB 타입 키워드 목록
    const VALID_TYPES = ['VARCHAR', 'CHARACTER', 'CHAR', 'TEXT', 'INT', 'INTEGER', 'BIGINT', 'SMALLINT',
        'NUMERIC', 'DECIMAL', 'FLOAT', 'DOUBLE', 'REAL', 'BOOLEAN', 'BOOL', 'DATE', 'TIME', 'TIMESTAMP',
        'TIMESTAMPTZ', 'SERIAL', 'BIGSERIAL', 'BYTEA', 'JSON', 'JSONB', 'UUID', 'BLOB', 'CLOB', 'NUMBER']

    // 컬럼명+타입이 유효한 행만 필터링 (코드 설명 등 비컬럼 행 제외)
    const validRows = dataRows.filter(cols => {
        const firstIsNum = !isNaN(Number(cols[0]))
        const offset = firstIsNum ? 1 : 0
        const colName = (cols[offset] ?? '').trim()
        const colType = (cols[offset + 2] ?? '').trim().toUpperCase()

        if (colName === '') return false
        // 컬럼명에 공백이나 ':' 가 있으면 설명 행으로 판단
        if (colName.includes(':') || colName.includes(' ')) return false
        // 타입이 알려진 DB 타입인지 확인
        if (!colType || !VALID_TYPES.some(t => colType.startsWith(t))) return false
        return true
    })

    return validRows.map((cols, idx) => {
        // 컬럼 순서 추정: No, 컬럼명, 설명, 타입, 크기, PK, NN, 비고
        // 또는: 컬럼명, 설명, 타입, 크기, PK, NN, 비고 (No 없이)
        const firstIsNum = !isNaN(Number(cols[0]))
        const offset = firstIsNum ? 1 : 0

        return {
            no: firstIsNum ? Number(cols[0]) : idx + 1,
            name: cols[offset] ?? '',
            comment: cols[offset + 1] ?? '',
            type: cols[offset + 2] ?? '',
            size: cols[offset + 3] ?? '',
            pk: ['Y', 'y', 'true', 'TRUE', '✓', 'O', 'o'].includes(cols[offset + 4] ?? ''),
            notNull: ['Y', 'y', 'true', 'TRUE', '✓', 'O', 'o'].includes(cols[offset + 5] ?? ''),
            note: cols[offset + 6] ?? '',
        }
    })
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
