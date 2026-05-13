import { describe, it, expect } from 'vitest'
import reducer, {
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
} from './spreadsheetSlice'
import type { CellData } from './spreadsheetSlice'

const initial = reducer(undefined, { type: '' })

describe('spreadsheetSlice — reducers', () => {
  it('returns initial state', () => {
    expect(initial.cells).toEqual({})
    expect(initial.rows).toBe(100)
    expect(initial.cols).toBe(26)
    expect(initial.columnLabels).toEqual({})
    expect(initial.isDirty).toBe(false)
  })

  it('setSelection sets selection', () => {
    const s = reducer(initial, setSelection({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }))
    expect(s.selection).toEqual({ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } })
  })

  it('setCell stores cell and marks dirty', () => {
    const cell: CellData = { value: 'Hello' }
    const s = reducer(initial, setCell({ key: '0,0', cell }))
    expect(s.cells['0,0']).toEqual(cell)
    expect(s.isDirty).toBe(true)
  })

  it('setCell deletes cell when value is empty and no format/formula', () => {
    const s0 = reducer(initial, setCell({ key: '0,0', cell: { value: 'Hello' } }))
    const s1 = reducer(s0, setCell({ key: '0,0', cell: { value: '' } }))
    expect(s1.cells['0,0']).toBeUndefined()
  })

  it('setCells sets multiple cells', () => {
    const s = reducer(initial, setCells({ '0,0': { value: 'A' }, '0,1': { value: 'B' } }))
    expect(s.cells['0,0'].value).toBe('A')
    expect(s.cells['0,1'].value).toBe('B')
  })

  it('replaceSheet imports cells, size and column labels', () => {
    const s = reducer(
      initial,
      replaceSheet({
        rows: 500,
        cols: 3,
        cells: { '0,0': { value: 'Imported' } },
        columnLabels: { 0: 'Name', 1: 'Amount' },
      }),
    )
    expect(s.rows).toBe(500)
    expect(s.cols).toBe(3)
    expect(s.cells['0,0'].value).toBe('Imported')
    expect(s.columnLabels[0]).toBe('Name')
    expect(s.isDirty).toBe(true)
  })

  it('clearSelection removes cell values', () => {
    let s = reducer(initial, setCell({ key: '0,0', cell: { value: 'X' } }))
    s = reducer(s, setSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }))
    s = reducer(s, clearSelection())
    expect(s.cells['0,0']).toBeUndefined()
  })

  it('setCellFormat applies format', () => {
    const s = reducer(initial, setCellFormat({ keys: ['0,0'], format: { bold: true } }))
    expect(s.cells['0,0']?.format?.bold).toBe(true)
  })

  it('setCellFormat merges with existing format', () => {
    let s = reducer(initial, setCell({ key: '1,1', cell: { value: 'Hi', format: { bold: true } } }))
    s = reducer(s, setCellFormat({ keys: ['1,1'], format: { italic: true } }))
    expect(s.cells['1,1']?.format?.bold).toBe(true)
    expect(s.cells['1,1']?.format?.italic).toBe(true)
  })

  it('setTitle marks dirty', () => {
    const s = reducer(initial, setTitle('New Name'))
    expect(s.title).toBe('New Name')
    expect(s.isDirty).toBe(true)
  })

  it('setColWidth stores column width', () => {
    const s = reducer(initial, setColWidth({ col: 3, width: 120 }))
    expect(s.colWidths[3]).toBe(120)
    expect(s.isDirty).toBe(true)
  })

  it('setRowHeight stores row height', () => {
    const s = reducer(initial, setRowHeight({ row: 3, height: 32 }))
    expect(s.rowHeights[3]).toBe(32)
    expect(s.isDirty).toBe(true)
  })

  it('addRow inserts row and shifts cells down', () => {
    let s = reducer(initial, setCell({ key: '2,0', cell: { value: 'Below' } }))
    s = reducer(s, addRow(2))
    expect(s.rows).toBe(101)
    expect(s.cells['3,0']?.value).toBe('Below')
    expect(s.cells['2,0']).toBeUndefined()
  })

  it('deleteRow removes row and shifts cells up', () => {
    let s = reducer(initial, setCell({ key: '3,0', cell: { value: 'Third' } }))
    s = reducer(s, deleteRow(2))
    expect(s.rows).toBe(99)
    expect(s.cells['2,0']?.value).toBe('Third')
    expect(s.cells['3,0']).toBeUndefined()
  })

  it('addCol inserts column and shifts cells right', () => {
    let s = reducer(initial, setCell({ key: '0,3', cell: { value: 'Right' } }))
    s = reducer(s, addCol(3))
    expect(s.cols).toBe(27)
    expect(s.cells['0,4']?.value).toBe('Right')
    expect(s.cells['0,3']).toBeUndefined()
  })

  it('deleteCol removes column and shifts cells left', () => {
    let s = reducer(initial, setCell({ key: '0,4', cell: { value: 'D' } }))
    s = reducer(s, deleteCol(3))
    expect(s.cols).toBe(25)
    expect(s.cells['0,3']?.value).toBe('D')
  })

  it('undo restores previous state', () => {
    let s = reducer(initial, setCell({ key: '0,0', cell: { value: 'First' } }))
    s = reducer(s, setCell({ key: '0,0', cell: { value: 'Second' } }))
    s = reducer(s, undo())
    expect(s.cells['0,0']?.value).toBe('First')
  })

  it('redo re-applies undone change', () => {
    let s = reducer(initial, setCell({ key: '0,0', cell: { value: 'A' } }))
    s = reducer(s, setCell({ key: '0,0', cell: { value: 'B' } }))
    s = reducer(s, undo())
    s = reducer(s, redo())
    expect(s.cells['0,0']?.value).toBe('B')
  })

  it('undo restores imported sheet size and column labels', () => {
    let s = reducer(
      initial,
      replaceSheet({
        rows: 500,
        cols: 2,
        cells: { '0,0': { value: 'Imported' } },
        columnLabels: { 0: 'Name' },
      }),
    )
    s = reducer(s, undo())
    expect(s.rows).toBe(100)
    expect(s.cols).toBe(26)
    expect(s.cells).toEqual({})
    expect(s.columnLabels).toEqual({})
  })

  it('undo does nothing when no history', () => {
    const s = reducer(initial, undo())
    expect(s.cells).toEqual({})
  })

  it('copy and paste clipboard', () => {
    let s = reducer(initial, setCell({ key: '0,0', cell: { value: 'Copy me' } }))
    s = reducer(s, setSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }))
    s = reducer(s, copySelection())
    s = reducer(s, setSelection({ start: { row: 2, col: 2 }, end: { row: 2, col: 2 } }))
    s = reducer(s, pasteClipboard())
    expect(s.cells['2,2']?.value).toBe('Copy me')
  })

  it('copy and paste clipboard preserves styles', () => {
    let s = reducer(
      initial,
      setCell({
        key: '0,0',
        cell: { value: 'Styled', format: { bold: true, bgColor: '#ffff00' } },
      }),
    )
    s = reducer(s, setSelection({ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }))
    s = reducer(s, copySelection())
    s = reducer(s, setSelection({ start: { row: 1, col: 1 }, end: { row: 1, col: 1 } }))
    s = reducer(s, pasteClipboard())
    expect(s.cells['1,1']?.format).toMatchObject({ bold: true, bgColor: '#ffff00' })
  })

  it('clearSheet resets to initial', () => {
    let s = reducer(initial, setCell({ key: '0,0', cell: { value: 'X' } }))
    s = reducer(s, clearSheet())
    expect(s.cells).toEqual({})
    expect(s.isDirty).toBe(false)
  })
})
