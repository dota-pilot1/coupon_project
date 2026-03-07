'use client'

import { useEffect, useRef, useCallback } from 'react'
import {
  TabulatorFull as Tabulator,
  type ColumnDefinition as TabColumnDef,
  type RowComponent,
} from 'tabulator-tables'
import 'tabulator-tables/dist/css/tabulator.min.css'

export type ColumnDefinition = {
  title: string
  field: string
  width?: number
  minWidth?: number
  hozAlign?: 'left' | 'center' | 'right'
  headerHozAlign?: 'left' | 'center' | 'right'
  formatter?: string | ((cell: unknown) => string | HTMLElement)
  headerSort?: boolean
  frozen?: boolean
  visible?: boolean
  resizable?: boolean
}

type SimpleTabulatorProps = {
  columns: ColumnDefinition[]
  data: Record<string, unknown>[]
  height?: string | number
  layout?: 'fitColumns' | 'fitData' | 'fitDataFill' | 'fitDataStretch' | 'fitDataTable'
  placeholder?: string
  selectable?: boolean | number
  onRowClick?: (row: Record<string, unknown>) => void
  onRowSelected?: (row: Record<string, unknown>) => void
  selectedRowId?: string | number | null
  rowIdField?: string
  className?: string
}

export default function SimpleTabulator5({
  columns,
  data,
  height = 400,
  layout = 'fitColumns',
  placeholder = '데이터가 없습니다.',
  selectable = false,
  onRowClick,
  onRowSelected,
  selectedRowId,
  rowIdField = 'id',
  className,
}: SimpleTabulatorProps) {
  const tableRef = useRef<HTMLDivElement>(null)
  const tabulatorRef = useRef<Tabulator | null>(null)
  const tableBuiltRef = useRef(false)

  // Store callbacks in refs to avoid recreating Tabulator
  const onRowClickRef = useRef(onRowClick)
  onRowClickRef.current = onRowClick
  const onRowSelectedRef = useRef(onRowSelected)
  onRowSelectedRef.current = onRowSelected

  // Initialize Tabulator
  useEffect(() => {
    if (!tableRef.current) return
    tableBuiltRef.current = false

    const table = new Tabulator(tableRef.current, {
      data,
      columns: columns as TabColumnDef[],
      height: typeof height === 'number' ? `${height}px` : height,
      layout,
      placeholder,
      selectable: selectable ? 1 : false,
      reactiveData: false,
      headerSortClickElement: 'icon',
    })

    table.on('tableBuilt', () => {
      tableBuiltRef.current = true
    })

    table.on('rowClick', (...args: unknown[]) => {
      const row = args[1] as RowComponent
      onRowClickRef.current?.(row.getData())
    })

    table.on('rowSelected', (...args: unknown[]) => {
      const row = args[0] as RowComponent
      onRowSelectedRef.current?.(row.getData())
    })

    tabulatorRef.current = table

    return () => {
      table.destroy()
      tabulatorRef.current = null
      tableBuiltRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columns, height, layout, placeholder, selectable])

  // Update data reactively (only after tableBuilt)
  useEffect(() => {
    if (tabulatorRef.current && tableBuiltRef.current) {
      tabulatorRef.current.replaceData(data).catch(() => {})
    }
  }, [data])

  // Highlight selected row
  const highlightRow = useCallback(() => {
    if (!tabulatorRef.current || selectedRowId == null) return
    const rows = tabulatorRef.current.getRows()
    rows.forEach((row) => {
      const el = row.getElement()
      if (row.getData()[rowIdField] === selectedRowId) {
        el.style.backgroundColor = '#dbeafe'
      } else {
        el.style.backgroundColor = ''
      }
    })
  }, [selectedRowId, rowIdField])

  useEffect(() => {
    if (tabulatorRef.current) {
      setTimeout(highlightRow, 50)
    }
  }, [selectedRowId, data, highlightRow])

  return <div ref={tableRef} className={className} />
}
