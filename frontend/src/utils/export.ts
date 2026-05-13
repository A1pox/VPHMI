import type { Cells } from '@store/spreadsheetSlice'
import { colIdxToLetter } from './formulas'

export function exportCSV(
  cells: Cells,
  rows: number,
  cols: number,
  columnLabels: Record<number, string> = {},
): string {
  const lines: string[] = []
  const header = [
    '',
    ...Array.from({ length: cols }, (_, c) => columnLabels[c] ?? colIdxToLetter(c)),
  ]
  lines.push(header.map(csvEscape).join(','))
  for (let r = 0; r < rows; r++) {
    const row: string[] = [String(r + 1)]
    for (let c = 0; c < cols; c++) {
      row.push(cells[`${r},${c}`]?.value ?? '')
    }
    lines.push(row.map(csvEscape).join(','))
  }
  return lines.join('\n')
}

function csvEscape(v: string): string {
  if (v.includes(',') || v.includes('"') || v.includes('\n')) {
    return '"' + v.replace(/"/g, '""') + '"'
  }
  return v
}

export function downloadCSV(content: string, filename: string): void {
  const bom = '﻿'
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' })
  triggerDownload(blob, filename)
}

export function exportJSON(
  cells: Cells,
  rows: number,
  cols: number,
  title: string,
  columnLabels: Record<number, string> = {},
): string {
  const grid: string[][] = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => cells[`${r},${c}`]?.value ?? ''),
  )
  return JSON.stringify({ title, rows, cols, columnLabels, cells, grid }, null, 2)
}

export function downloadJSON(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json;charset=utf-8;' })
  triggerDownload(blob, filename)
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  cells: Cells
  rows: number
  cols: number
  columnLabels: Record<number, string>
}

export function parseCSV(text: string): ImportResult {
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return { cells: {}, rows: 0, cols: 0, columnLabels: {} }

  const parsed = lines.map(parseCSVLine)
  const firstRow = parsed[0]
  const hasHeader =
    firstRow.some(Boolean) && firstRow.every((v) => Number.isNaN(Number(v)) || v === '')
  const hasRowNumberColumn = hasHeader && firstRow[0] === ''
  const dataRows = hasHeader ? parsed.slice(1) : parsed
  const startCol = hasRowNumberColumn ? 1 : 0
  const columnLabels: Record<number, string> = {}

  if (hasHeader) {
    for (let c = startCol; c < firstRow.length; c++) {
      const label = firstRow[c]?.trim()
      if (label) columnLabels[c - startCol] = label
    }
  }

  const cells: Cells = {}
  for (let r = 0; r < dataRows.length; r++) {
    const row = dataRows[r]
    for (let c = startCol; c < row.length; c++) {
      const val = row[c]
      if (val) cells[`${r},${c - startCol}`] = { value: val }
    }
  }

  const cols = Math.max(firstRow.length - startCol, ...dataRows.map((r) => r.length - startCol), 0)
  return { cells, rows: dataRows.length, cols, columnLabels }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"'
        i++
      } else inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(cur)
      cur = ''
    } else {
      cur += ch
    }
  }
  result.push(cur)
  return result
}
