import { createSlice, createAsyncThunk, PayloadAction, current } from '@reduxjs/toolkit'
import * as api from '@api/client'
import type { RootState } from './index'

export interface CellFormat {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  bgColor?: string
  color?: string
  align?: 'left' | 'center' | 'right'
  numFormat?: 'default' | 'percent' | 'currency' | 'date'
}

export interface CellData {
  value: string
  formula?: string
  format?: CellFormat
}

export type Cells = Record<string, CellData>

export interface SelectionRange {
  start: { row: number; col: number }
  end: { row: number; col: number }
}

interface SpreadsheetData {
  rows: number
  cols: number
  cells: Cells
  colWidths?: Record<number, number>
  rowHeights?: Record<number, number>
  columnLabels?: Record<number, string>
}

interface SheetSnapshot {
  rows: number
  cols: number
  cells: Cells
  colWidths: Record<number, number>
  rowHeights: Record<number, number>
  columnLabels: Record<number, string>
}

interface SpreadsheetState {
  docId: string | null
  title: string
  rows: number
  cols: number
  cells: Cells
  colWidths: Record<number, number>
  rowHeights: Record<number, number>
  columnLabels: Record<number, string>
  selection: SelectionRange | null
  isDirty: boolean
  loading: boolean
  saving: boolean
  error: string | null
  past: SheetSnapshot[]
  future: SheetSnapshot[]
  clipboard: { cells: Cells; range: SelectionRange } | null
}

const initial: SpreadsheetState = {
  docId: null,
  title: '',
  rows: 100,
  cols: 26,
  cells: {},
  colWidths: {},
  rowHeights: {},
  columnLabels: {},
  selection: null,
  isDirty: false,
  loading: false,
  saving: false,
  error: null,
  past: [],
  future: [],
  clipboard: null,
}

export const loadDocument = createAsyncThunk('spreadsheet/load', async (id: string) => {
  const doc = await api.getDocument(id)
  const parsed: SpreadsheetData = { rows: 100, cols: 26, cells: {} }
  try {
    const d = JSON.parse(doc.data) as Partial<SpreadsheetData>
    if (d && typeof d === 'object') {
      if (d.cells && typeof d.cells === 'object') parsed.cells = d.cells
      if (typeof d.rows === 'number') parsed.rows = d.rows
      if (typeof d.cols === 'number') parsed.cols = d.cols
      if (d.colWidths) parsed.colWidths = d.colWidths
      if (d.rowHeights) parsed.rowHeights = d.rowHeights
      if (d.columnLabels) parsed.columnLabels = d.columnLabels
    }
  } catch {
    /* malformed data, use defaults */
  }
  return { doc, parsed }
})

export const saveDocument = createAsyncThunk('spreadsheet/save', async (_, { getState }) => {
  const s = (getState() as RootState).spreadsheet
  if (!s.docId) throw new Error('Нет открытого документа')
  const data: SpreadsheetData = {
    rows: s.rows,
    cols: s.cols,
    cells: s.cells,
    colWidths: s.colWidths,
    rowHeights: s.rowHeights,
    columnLabels: s.columnLabels,
  }
  return api.updateDocument(s.docId, { title: s.title, data: JSON.stringify(data) })
})

function pushHistory(state: SpreadsheetState) {
  state.past.push(makeSnapshot(state))
  if (state.past.length > 50) state.past.shift()
  state.future = []
}

function makeSnapshot(state: SpreadsheetState): SheetSnapshot {
  return {
    rows: state.rows,
    cols: state.cols,
    cells: current(state.cells),
    colWidths: current(state.colWidths),
    rowHeights: current(state.rowHeights),
    columnLabels: current(state.columnLabels),
  }
}

function restoreSnapshot(state: SpreadsheetState, snapshot: SheetSnapshot) {
  state.rows = snapshot.rows
  state.cols = snapshot.cols
  state.cells = snapshot.cells
  state.colWidths = snapshot.colWidths
  state.rowHeights = snapshot.rowHeights
  state.columnLabels = snapshot.columnLabels
}

function getSelectionKeys(sel: SelectionRange): string[] {
  const keys: string[] = []
  const r0 = Math.min(sel.start.row, sel.end.row)
  const r1 = Math.max(sel.start.row, sel.end.row)
  const c0 = Math.min(sel.start.col, sel.end.col)
  const c1 = Math.max(sel.start.col, sel.end.col)
  for (let r = r0; r <= r1; r++) for (let c = c0; c <= c1; c++) keys.push(`${r},${c}`)
  return keys
}

const spreadsheetSlice = createSlice({
  name: 'spreadsheet',
  initialState: initial,
  reducers: {
    setSelection(state, a: PayloadAction<SelectionRange | null>) {
      state.selection = a.payload
    },

    setCell(state, a: PayloadAction<{ key: string; cell: CellData }>) {
      pushHistory(state)
      if (a.payload.cell.value === '' && !a.payload.cell.formula && !a.payload.cell.format) {
        delete state.cells[a.payload.key]
      } else {
        state.cells[a.payload.key] = a.payload.cell
      }
      state.isDirty = true
    },

    setCells(state, a: PayloadAction<Record<string, CellData>>) {
      pushHistory(state)
      for (const [key, cell] of Object.entries(a.payload)) {
        if (cell.value === '' && !cell.formula && !cell.format) {
          delete state.cells[key]
        } else {
          state.cells[key] = cell
        }
      }
      state.isDirty = true
    },

    replaceSheet(
      state,
      a: PayloadAction<{
        cells: Cells
        rows: number
        cols: number
        columnLabels?: Record<number, string>
      }>,
    ) {
      pushHistory(state)
      state.cells = a.payload.cells
      state.rows = Math.max(1, a.payload.rows)
      state.cols = Math.max(1, a.payload.cols)
      state.columnLabels = a.payload.columnLabels ?? {}
      state.colWidths = {}
      state.rowHeights = {}
      state.selection = null
      state.isDirty = true
    },

    clearSelection(state) {
      if (!state.selection) return
      pushHistory(state)
      for (const key of getSelectionKeys(state.selection)) {
        const existing = state.cells[key]
        if (existing?.format) {
          state.cells[key] = { value: '', format: existing.format }
        } else {
          delete state.cells[key]
        }
      }
      state.isDirty = true
    },

    setCellFormat(state, a: PayloadAction<{ keys: string[]; format: Partial<CellFormat> }>) {
      pushHistory(state)
      for (const key of a.payload.keys) {
        const cell = state.cells[key]
        if (cell) {
          cell.format = { ...cell.format, ...a.payload.format }
        } else {
          state.cells[key] = { value: '', format: { ...a.payload.format } }
        }
      }
      state.isDirty = true
    },

    setTitle(state, a: PayloadAction<string>) {
      state.title = a.payload
      state.isDirty = true
    },

    setColWidth(state, a: PayloadAction<{ col: number; width: number }>) {
      state.colWidths[a.payload.col] = a.payload.width
      state.isDirty = true
    },

    setRowHeight(state, a: PayloadAction<{ row: number; height: number }>) {
      state.rowHeights[a.payload.row] = a.payload.height
      state.isDirty = true
    },

    addRow(state, a: PayloadAction<number>) {
      pushHistory(state)
      const insertAt = a.payload
      const newCells: Cells = {}
      for (const [key, cell] of Object.entries(state.cells)) {
        const [r, c] = key.split(',').map(Number)
        newCells[r >= insertAt ? `${r + 1},${c}` : key] = cell
      }
      const newRowHeights: Record<number, number> = {}
      for (const [row, h] of Object.entries(state.rowHeights)) {
        const r = Number(row)
        newRowHeights[r >= insertAt ? r + 1 : r] = h
      }
      state.cells = newCells
      state.rowHeights = newRowHeights
      state.rows++
      state.isDirty = true
    },

    deleteRow(state, a: PayloadAction<number>) {
      pushHistory(state)
      const del = a.payload
      const newCells: Cells = {}
      for (const [key, cell] of Object.entries(state.cells)) {
        const [r, c] = key.split(',').map(Number)
        if (r < del) newCells[key] = cell
        else if (r > del) newCells[`${r - 1},${c}`] = cell
      }
      const newRowHeights: Record<number, number> = {}
      for (const [row, h] of Object.entries(state.rowHeights)) {
        const r = Number(row)
        if (r < del) newRowHeights[r] = h
        else if (r > del) newRowHeights[r - 1] = h
      }
      state.cells = newCells
      state.rowHeights = newRowHeights
      state.rows = Math.max(1, state.rows - 1)
      state.isDirty = true
    },

    addCol(state, a: PayloadAction<number>) {
      pushHistory(state)
      const insertAt = a.payload
      const newCells: Cells = {}
      for (const [key, cell] of Object.entries(state.cells)) {
        const [r, c] = key.split(',').map(Number)
        newCells[c >= insertAt ? `${r},${c + 1}` : key] = cell
      }
      const newColWidths: Record<number, number> = {}
      for (const [col, w] of Object.entries(state.colWidths)) {
        const c = Number(col)
        newColWidths[c >= insertAt ? c + 1 : c] = w
      }
      const newColumnLabels: Record<number, string> = {}
      for (const [col, label] of Object.entries(state.columnLabels)) {
        const c = Number(col)
        newColumnLabels[c >= insertAt ? c + 1 : c] = label
      }
      state.cells = newCells
      state.colWidths = newColWidths
      state.columnLabels = newColumnLabels
      state.cols++
      state.isDirty = true
    },

    deleteCol(state, a: PayloadAction<number>) {
      pushHistory(state)
      const del = a.payload
      const newCells: Cells = {}
      for (const [key, cell] of Object.entries(state.cells)) {
        const [r, c] = key.split(',').map(Number)
        if (c < del) newCells[key] = cell
        else if (c > del) newCells[`${r},${c - 1}`] = cell
      }
      const newColWidths: Record<number, number> = {}
      for (const [col, w] of Object.entries(state.colWidths)) {
        const c = Number(col)
        if (c < del) newColWidths[c] = w
        else if (c > del) newColWidths[c - 1] = w
      }
      const newColumnLabels: Record<number, string> = {}
      for (const [col, label] of Object.entries(state.columnLabels)) {
        const c = Number(col)
        if (c < del) newColumnLabels[c] = label
        else if (c > del) newColumnLabels[c - 1] = label
      }
      state.cells = newCells
      state.colWidths = newColWidths
      state.columnLabels = newColumnLabels
      state.cols = Math.max(1, state.cols - 1)
      state.isDirty = true
    },

    undo(state) {
      if (state.past.length === 0) return
      state.future.unshift(makeSnapshot(state))
      if (state.future.length > 50) state.future.pop()
      restoreSnapshot(state, state.past.pop()!)
      state.isDirty = true
    },

    redo(state) {
      if (state.future.length === 0) return
      state.past.push(makeSnapshot(state))
      if (state.past.length > 50) state.past.shift()
      restoreSnapshot(state, state.future.shift()!)
      state.isDirty = true
    },

    copySelection(state) {
      if (!state.selection) return
      const copied: Cells = {}
      for (const key of getSelectionKeys(state.selection)) {
        if (state.cells[key]) copied[key] = { ...state.cells[key] }
      }
      state.clipboard = { cells: copied, range: state.selection }
    },

    pasteClipboard(state) {
      if (!state.clipboard || !state.selection) return
      pushHistory(state)
      const clipRange = state.clipboard.range
      const baseRow = Math.min(clipRange.start.row, clipRange.end.row)
      const baseCol = Math.min(clipRange.start.col, clipRange.end.col)
      const targetRow = state.selection.start.row
      const targetCol = state.selection.start.col

      for (const [key, cell] of Object.entries(state.clipboard.cells)) {
        const [r, c] = key.split(',').map(Number)
        const newKey = `${r - baseRow + targetRow},${c - baseCol + targetCol}`
        state.cells[newKey] = { ...cell }
      }
      state.isDirty = true
    },

    clearSheet(state) {
      Object.assign(state, initial)
    },
  },
  extraReducers: (b) => {
    b.addCase(loadDocument.pending, (state) => {
      state.loading = true
      state.error = null
      state.cells = {}
      state.selection = null
      state.isDirty = false
      state.past = []
      state.future = []
    })
    b.addCase(loadDocument.fulfilled, (state, a) => {
      state.loading = false
      state.docId = a.payload.doc.id
      state.title = a.payload.doc.title
      state.rows = a.payload.parsed.rows
      state.cols = a.payload.parsed.cols
      state.cells = a.payload.parsed.cells
      state.colWidths = a.payload.parsed.colWidths ?? {}
      state.rowHeights = a.payload.parsed.rowHeights ?? {}
      state.columnLabels = a.payload.parsed.columnLabels ?? {}
      state.isDirty = false
    })
    b.addCase(loadDocument.rejected, (state, a) => {
      state.loading = false
      state.error = a.error.message ?? 'Ошибка загрузки'
    })
    b.addCase(saveDocument.pending, (state) => {
      state.saving = true
    })
    b.addCase(saveDocument.fulfilled, (state) => {
      state.saving = false
      state.isDirty = false
    })
    b.addCase(saveDocument.rejected, (state, a) => {
      state.saving = false
      state.error = a.error.message ?? 'Ошибка сохранения'
    })
  },
})

export const {
  setSelection,
  setCell,
  setCells,
  replaceSheet,
  clearSelection,
  setCellFormat,
  setTitle,
  setColWidth,
  setRowHeight,
  addRow,
  deleteRow,
  addCol,
  deleteCol,
  undo,
  redo,
  copySelection,
  pasteClipboard,
  clearSheet,
} = spreadsheetSlice.actions

export { getSelectionKeys }
export default spreadsheetSlice.reducer
