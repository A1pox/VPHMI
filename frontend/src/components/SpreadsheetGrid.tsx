import { useEffect, useRef, useState, useCallback, useMemo, memo } from 'react'
import { useAppDispatch, useAppSelector } from '@store/index'
import {
  setSelection,
  setCell,
  clearSelection,
  setCellFormat,
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
  getSelectionKeys,
} from '@store/spreadsheetSlice'
import type { CellData, SelectionRange } from '@store/spreadsheetSlice'
import { evaluateFormula, formatCellDisplay, colIdxToLetter, cellKeyToRef } from '@utils/formulas'
import ContextMenu from './ContextMenu'
import type { ContextMenuItem } from './ContextMenu'

const ROW_H_DEFAULT = 22
const COL_W_DEFAULT = 80
const ROW_NUM_W = 40
const OVERSCAN = 8

function inRange(row: number, col: number, sel: SelectionRange): boolean {
  const r0 = Math.min(sel.start.row, sel.end.row)
  const r1 = Math.max(sel.start.row, sel.end.row)
  const c0 = Math.min(sel.start.col, sel.end.col)
  const c1 = Math.max(sel.start.col, sel.end.col)
  return row >= r0 && row <= r1 && col >= c0 && col <= c1
}

/** Detect boolean cells for display (TRUE/FALSE → center-align like Excel) */
function getCellDisplayClass(value: string): string {
  if (value === 'TRUE' || value === 'FALSE') return 'cell-bool'
  const num = Number(value)
  if (value !== '' && !isNaN(num)) return 'cell-num'
  return ''
}

function normalizeCellInput(value: string): string {
  if (/^(true|false)$/i.test(value.trim())) return value.trim().toUpperCase()
  return value
}

const SpreadsheetGrid = memo(function SpreadsheetGrid() {
  const dispatch = useAppDispatch()
  const { cells, rows, cols, colWidths, rowHeights, columnLabels, selection } = useAppSelector(
    (s) => s.spreadsheet,
  )

  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null)
  const [editValue, setEditValue] = useState('')
  const [scrollTop, setScrollTop] = useState(0)
  const [containerHeight, setContainerHeight] = useState(500)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    row: number
    col: number
  } | null>(null)
  const [resizingCol, setResizingCol] = useState<{
    col: number
    startX: number
    startW: number
  } | null>(null)
  const [resizingRow, setResizingRow] = useState<{
    row: number
    startY: number
    startH: number
  } | null>(null)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const formulaBarInputRef = useRef<HTMLInputElement>(null)

  // ── Cumulative row heights for variable-height virtualization ──
  const rowHeightsList = useMemo(
    () => Array.from({ length: rows }, (_, i) => rowHeights[i] ?? ROW_H_DEFAULT),
    [rows, rowHeights],
  )
  const cumulativeHeights = useMemo(() => {
    const arr = new Array<number>(rows + 1)
    arr[0] = 0
    for (let i = 0; i < rows; i++) arr[i + 1] = arr[i] + rowHeightsList[i]
    return arr
  }, [rows, rowHeightsList])
  const totalHeight = cumulativeHeights[rows]

  const getColW = useCallback((c: number) => colWidths[c] ?? COL_W_DEFAULT, [colWidths])
  const getRowH = useCallback((r: number) => rowHeights[r] ?? ROW_H_DEFAULT, [rowHeights])

  // Virtualisation: find visible rows using binary search on cumulative heights
  const startRow = useMemo(() => {
    const target = Math.max(0, scrollTop - OVERSCAN * ROW_H_DEFAULT)
    let lo = 0,
      hi = rows - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cumulativeHeights[mid + 1] <= target) lo = mid + 1
      else hi = mid
    }
    return lo
  }, [scrollTop, rows, cumulativeHeights])

  const endRow = useMemo(() => {
    const target = scrollTop + containerHeight + OVERSCAN * ROW_H_DEFAULT
    let lo = startRow,
      hi = rows - 1
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1
      if (cumulativeHeights[mid] < target) lo = mid
      else hi = mid - 1
    }
    return Math.min(rows - 1, lo)
  }, [scrollTop, containerHeight, rows, cumulativeHeights, startRow])

  const topSpacer = cumulativeHeights[startRow]
  const bottomSpacer = Math.max(0, totalHeight - cumulativeHeights[endRow + 1])

  // ── Container size observer ──
  useEffect(() => {
    const update = () => {
      if (wrapperRef.current) setContainerHeight(wrapperRef.current.clientHeight)
    }
    update()
    const ro = new ResizeObserver(update)
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => ro.disconnect()
  }, [])

  // ── Focus editing input ──
  useEffect(() => {
    if (editingCell && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingCell])

  // ── Scroll selected cell into view ──
  useEffect(() => {
    if (!selection) return
    const row = selection.start.row
    const rowTop = cumulativeHeights[row]
    const rowBot = cumulativeHeights[row + 1]
    if (rowTop < scrollTop + ROW_H_DEFAULT) {
      wrapperRef.current?.scrollTo({ top: Math.max(0, rowTop - ROW_H_DEFAULT) })
    } else if (rowBot > scrollTop + containerHeight - ROW_H_DEFAULT) {
      wrapperRef.current?.scrollTo({ top: rowBot - containerHeight + ROW_H_DEFAULT * 2 })
    }
  }, [selection, cumulativeHeights, scrollTop, containerHeight])

  // ── Column resize mouse events ──
  useEffect(() => {
    if (!resizingCol) return
    const onMove = (e: MouseEvent) => {
      const newW = Math.max(30, resizingCol.startW + (e.clientX - resizingCol.startX))
      dispatch(setColWidth({ col: resizingCol.col, width: newW }))
    }
    const onUp = () => setResizingCol(null)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [resizingCol, dispatch])

  // ── Row resize mouse events ──
  useEffect(() => {
    if (!resizingRow) return
    const onMove = (e: MouseEvent) => {
      const newH = Math.max(14, resizingRow.startH + (e.clientY - resizingRow.startY))
      dispatch(setRowHeight({ row: resizingRow.row, height: newH }))
    }
    const onUp = () => setResizingRow(null)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [resizingRow, dispatch])

  // ── Cell display ──
  const getCellDisplayValue = useCallback(
    (row: number, col: number): string => {
      const cell = cells[`${row},${col}`]
      if (!cell) return ''
      if (cell.formula) {
        return formatCellDisplay({ ...cell, value: evaluateFormula(cell.formula, cells) })
      }
      return formatCellDisplay(cell)
    },
    [cells],
  )

  const commitEdit = useCallback(() => {
    if (!editingCell) return
    const key = `${editingCell.row},${editingCell.col}`
    const existing = cells[key]
    const isFormula = editValue.startsWith('=')
    const normalizedValue = isFormula ? editValue : normalizeCellInput(editValue)
    const cellData: CellData = {
      value: isFormula ? evaluateFormula(editValue, cells) : normalizedValue,
      formula: isFormula ? editValue : undefined,
      format: existing?.format,
    }
    dispatch(setCell({ key, cell: cellData }))
    setEditingCell(null)
  }, [editingCell, editValue, cells, dispatch])

  const cancelEdit = useCallback(() => setEditingCell(null), [])

  const startEdit = useCallback(
    (row: number, col: number, initial?: string) => {
      const key = `${row},${col}`
      const cell = cells[key]
      dispatch(setSelection({ start: { row, col }, end: { row, col } }))
      setEditingCell({ row, col })
      setEditValue(initial !== undefined ? initial : (cell?.formula ?? cell?.value ?? ''))
    },
    [cells, dispatch],
  )

  const handleCellClick = useCallback(
    (row: number, col: number, e: React.MouseEvent) => {
      if (editingCell) commitEdit()
      if (e.shiftKey && selection) {
        dispatch(setSelection({ start: selection.start, end: { row, col } }))
      } else {
        dispatch(setSelection({ start: { row, col }, end: { row, col } }))
      }
      wrapperRef.current?.focus()
    },
    [editingCell, commitEdit, selection, dispatch],
  )

  const handleCellDblClick = useCallback(
    (row: number, col: number) => startEdit(row, col),
    [startEdit],
  )

  const handleCellRightClick = useCallback(
    (e: React.MouseEvent, row: number, col: number) => {
      e.preventDefault()
      if (!selection || !inRange(row, col, selection)) {
        dispatch(setSelection({ start: { row, col }, end: { row, col } }))
      }
      setContextMenu({ x: e.clientX, y: e.clientY, row, col })
    },
    [selection, dispatch],
  )

  const handleEditKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (!editingCell) return
      if (e.key === 'Enter') {
        e.preventDefault()
        commitEdit()
        const nextRow = Math.min(rows - 1, editingCell.row + 1)
        dispatch(
          setSelection({
            start: { row: nextRow, col: editingCell.col },
            end: { row: nextRow, col: editingCell.col },
          }),
        )
        wrapperRef.current?.focus()
      } else if (e.key === 'Tab') {
        e.preventDefault()
        commitEdit()
        const nextCol = e.shiftKey
          ? Math.max(0, editingCell.col - 1)
          : Math.min(cols - 1, editingCell.col + 1)
        dispatch(
          setSelection({
            start: { row: editingCell.row, col: nextCol },
            end: { row: editingCell.row, col: nextCol },
          }),
        )
        wrapperRef.current?.focus()
      } else if (e.key === 'Escape') {
        cancelEdit()
        wrapperRef.current?.focus()
      }
    },
    [editingCell, commitEdit, cancelEdit, rows, cols, dispatch],
  )

  const handleGridKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (editingCell) return
      if (!selection) return
      const { row, col } = selection.start

      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault()
            dispatch(undo())
            return
          case 'y':
            e.preventDefault()
            dispatch(redo())
            return
          case 'Z':
            e.preventDefault()
            dispatch(redo())
            return
          case 'c':
            e.preventDefault()
            dispatch(copySelection())
            return
          case 'x':
            e.preventDefault()
            dispatch(copySelection())
            dispatch(clearSelection())
            return
          case 'v':
            e.preventDefault()
            dispatch(pasteClipboard())
            return
          case 'a':
            e.preventDefault()
            dispatch(
              setSelection({ start: { row: 0, col: 0 }, end: { row: rows - 1, col: cols - 1 } }),
            )
            return
          case 'b':
            e.preventDefault()
            if (selection)
              dispatch(
                setCellFormat({
                  keys: getSelectionKeys(selection),
                  format: { bold: !cells[`${row},${col}`]?.format?.bold },
                }),
              )
            return
          case 'i':
            e.preventDefault()
            if (selection)
              dispatch(
                setCellFormat({
                  keys: getSelectionKeys(selection),
                  format: { italic: !cells[`${row},${col}`]?.format?.italic },
                }),
              )
            return
          case 'u':
            e.preventDefault()
            if (selection)
              dispatch(
                setCellFormat({
                  keys: getSelectionKeys(selection),
                  format: { underline: !cells[`${row},${col}`]?.format?.underline },
                }),
              )
            return
        }
        return
      }

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault()
          if (e.shiftKey && selection) {
            dispatch(
              setSelection({
                start: selection.start,
                end: { row: Math.max(0, selection.end.row - 1), col: selection.end.col },
              }),
            )
          } else if (row > 0) {
            dispatch(setSelection({ start: { row: row - 1, col }, end: { row: row - 1, col } }))
          }
          break
        case 'ArrowDown':
          e.preventDefault()
          if (e.shiftKey && selection) {
            dispatch(
              setSelection({
                start: selection.start,
                end: { row: Math.min(rows - 1, selection.end.row + 1), col: selection.end.col },
              }),
            )
          } else if (row + 1 < rows) {
            dispatch(setSelection({ start: { row: row + 1, col }, end: { row: row + 1, col } }))
          }
          break
        case 'ArrowLeft':
          e.preventDefault()
          if (e.shiftKey && selection) {
            dispatch(
              setSelection({
                start: selection.start,
                end: { row: selection.end.row, col: Math.max(0, selection.end.col - 1) },
              }),
            )
          } else if (col > 0) {
            dispatch(setSelection({ start: { row, col: col - 1 }, end: { row, col: col - 1 } }))
          }
          break
        case 'ArrowRight':
          e.preventDefault()
          if (e.shiftKey && selection) {
            dispatch(
              setSelection({
                start: selection.start,
                end: { row: selection.end.row, col: Math.min(cols - 1, selection.end.col + 1) },
              }),
            )
          } else if (col + 1 < cols) {
            dispatch(setSelection({ start: { row, col: col + 1 }, end: { row, col: col + 1 } }))
          }
          break
        case 'Enter':
        case 'F2':
          startEdit(row, col)
          break
        case 'Delete':
        case 'Backspace':
          dispatch(clearSelection())
          break
        case 'Tab':
          e.preventDefault()
          if (e.shiftKey) {
            if (col > 0)
              dispatch(setSelection({ start: { row, col: col - 1 }, end: { row, col: col - 1 } }))
          } else {
            if (col + 1 < cols)
              dispatch(setSelection({ start: { row, col: col + 1 }, end: { row, col: col + 1 } }))
          }
          break
        default:
          if (e.key.length === 1 && !e.altKey) startEdit(row, col, e.key)
      }
    },
    [editingCell, selection, rows, cols, cells, dispatch, startEdit],
  )

  const contextMenuItems = useCallback((): ContextMenuItem[] => {
    if (!contextMenu) return []
    const { row, col } = contextMenu
    return [
      { label: 'Вставить строку выше', action: () => dispatch(addRow(row)) },
      { label: 'Вставить строку ниже', action: () => dispatch(addRow(row + 1)) },
      { label: 'Удалить строку', action: () => dispatch(deleteRow(row)), danger: true },
      { separator: true, label: '', action: () => {} },
      { label: 'Вставить столбец слева', action: () => dispatch(addCol(col)) },
      { label: 'Вставить столбец справа', action: () => dispatch(addCol(col + 1)) },
      { label: 'Удалить столбец', action: () => dispatch(deleteCol(col)), danger: true },
    ]
  }, [contextMenu, dispatch])

  const activeCell = selection ? cells[`${selection.start.row},${selection.start.col}`] : undefined
  const formulaBarValue = editingCell ? editValue : (activeCell?.formula ?? activeCell?.value ?? '')
  const cellRef = selection ? cellKeyToRef(`${selection.start.row},${selection.start.col}`) : ''

  const totalColWidth = useMemo(
    () => ROW_NUM_W + Array.from({ length: cols }, (_, c) => getColW(c)).reduce((a, b) => a + b, 0),
    [cols, getColW],
  )

  return (
    <>
      {/* Formula bar */}
      <div className="formula-bar">
        <span className="cell-ref">{cellRef}</span>
        <input
          ref={formulaBarInputRef}
          className="formula-input"
          value={formulaBarValue}
          placeholder="Выберите ячейку..."
          onChange={(e) => {
            if (editingCell) setEditValue(e.target.value)
          }}
          onFocus={() => {
            if (selection && !editingCell) startEdit(selection.start.row, selection.start.col)
          }}
          onKeyDown={handleEditKeyDown}
        />
      </div>

      {/* Grid */}
      <div
        ref={wrapperRef}
        className="grid-wrapper"
        tabIndex={0}
        onKeyDown={handleGridKeyDown}
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        style={{ outline: 'none' }}
      >
        <table className="spreadsheet" style={{ width: totalColWidth }}>
          <thead>
            <tr>
              <th className="corner-header" style={{ width: ROW_NUM_W, minWidth: ROW_NUM_W }} />
              {Array.from({ length: cols }, (_, c) => (
                <th
                  key={c}
                  style={{ width: getColW(c), minWidth: getColW(c) }}
                  className={
                    selection &&
                    inRange(0, c, {
                      start: { row: 0, col: selection.start.col },
                      end: { row: 0, col: selection.end.col },
                    })
                      ? 'col-header selected-header'
                      : 'col-header'
                  }
                >
                  {columnLabels[c] ?? colIdxToLetter(c)}
                  <div
                    className="col-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setResizingCol({ col: c, startX: e.clientX, startW: getColW(c) })
                    }}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {topSpacer > 0 && (
              <tr style={{ height: topSpacer }}>
                <td colSpan={cols + 1} />
              </tr>
            )}
            {Array.from({ length: endRow - startRow + 1 }, (_, i) => startRow + i).map((row) => (
              <tr key={row} style={{ height: getRowH(row) }}>
                <td
                  className={
                    selection &&
                    inRange(row, 0, {
                      start: { row: selection.start.row, col: 0 },
                      end: { row: selection.end.row, col: 0 },
                    })
                      ? 'row-header selected-header'
                      : 'row-header'
                  }
                  style={{ position: 'relative' }}
                >
                  {row + 1}
                  {/* Row height resize handle */}
                  <div
                    className="row-resize-handle"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      setResizingRow({ row, startY: e.clientY, startH: getRowH(row) })
                    }}
                  />
                </td>
                {Array.from({ length: cols }, (_, col) => {
                  const key = `${row},${col}`
                  const cell = cells[key]
                  const isEditing = editingCell?.row === row && editingCell?.col === col
                  const isSingleSelected =
                    selection?.start.row === row &&
                    selection?.start.col === col &&
                    selection.end.row === row &&
                    selection.end.col === col
                  const isInRange = selection ? inRange(row, col, selection) : false
                  const fmt = cell?.format
                  const displayVal = getCellDisplayValue(row, col)
                  const valClass = getCellDisplayClass(displayVal)

                  return (
                    <td
                      key={col}
                      id={`cell-${row}-${col}`}
                      className={`cell${isSingleSelected ? ' cell-selected' : ''}${isInRange && !isSingleSelected ? ' cell-in-range' : ''}`}
                      style={{
                        width: getColW(col),
                        minWidth: getColW(col),
                        backgroundColor: fmt?.bgColor ?? undefined,
                        textAlign:
                          valClass === 'cell-bool'
                            ? 'center'
                            : (fmt?.align ?? (valClass === 'cell-num' ? 'right' : 'left')),
                      }}
                      onClick={(e) => handleCellClick(row, col, e)}
                      onDoubleClick={() => handleCellDblClick(row, col)}
                      onContextMenu={(e) => handleCellRightClick(e, row, col)}
                    >
                      {isEditing ? (
                        <input
                          ref={inputRef}
                          className="cell-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={handleEditKeyDown}
                          onBlur={commitEdit}
                          style={{
                            fontWeight: fmt?.bold ? 'bold' : undefined,
                            fontStyle: fmt?.italic ? 'italic' : undefined,
                            textDecoration: fmt?.underline ? 'underline' : undefined,
                            color: fmt?.color ?? undefined,
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontWeight: fmt?.bold ? 'bold' : undefined,
                            fontStyle: fmt?.italic ? 'italic' : undefined,
                            textDecoration: fmt?.underline ? 'underline' : undefined,
                            color: fmt?.color ?? undefined,
                          }}
                        >
                          {displayVal}
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
            {bottomSpacer > 0 && (
              <tr style={{ height: bottomSpacer }}>
                <td colSpan={cols + 1} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={contextMenuItems()}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  )
})

export default SpreadsheetGrid
