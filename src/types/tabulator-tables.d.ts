declare module 'tabulator-tables' {
  export interface ColumnDefinition {
    title: string
    field: string
    width?: number
    minWidth?: number
    hozAlign?: 'left' | 'center' | 'right'
    headerHozAlign?: 'left' | 'center' | 'right'
    formatter?: string | ((cell: CellComponent) => string | HTMLElement)
    headerSort?: boolean
    frozen?: boolean
    visible?: boolean
    resizable?: boolean
    [key: string]: unknown
  }

  export interface CellComponent {
    getValue(): unknown
    getData(): Record<string, unknown>
    getElement(): HTMLElement
    getRow(): RowComponent
    getColumn(): { getField(): string }
  }

  export interface RowComponent {
    getData(): Record<string, unknown>
    getElement(): HTMLElement
    select(): void
    deselect(): void
    getIndex(): number
  }

  export interface Options {
    data?: Record<string, unknown>[]
    columns?: ColumnDefinition[]
    height?: string | number
    layout?: string
    placeholder?: string
    selectable?: boolean | number
    reactiveData?: boolean
    headerSortClickElement?: string
    [key: string]: unknown
  }

  export class TabulatorFull {
    constructor(element: HTMLElement | string, options: Options)
    destroy(): void
    replaceData(data: Record<string, unknown>[]): Promise<void>
    getRows(): RowComponent[]
    on(event: string, callback: (...args: unknown[]) => void): void
    off(event: string, callback?: (...args: unknown[]) => void): void
    setData(data: Record<string, unknown>[]): Promise<void>
    getData(): Record<string, unknown>[]
    getSelectedData(): Record<string, unknown>[]
    selectRow(row?: RowComponent | number): void
    deselectRow(row?: RowComponent | number): void
    redraw(force?: boolean): void
  }

  export default TabulatorFull
}

declare module 'tabulator-tables/dist/css/tabulator.min.css'
