import type { CellData, Cells } from '@store/spreadsheetSlice'

export function evaluateFormula(
  formula: string,
  cells: Cells,
  visited = new Set<string>(),
): string {
  if (!formula.startsWith('=')) return formula
  const expr = formula.slice(1).trim()
  try {
    const result = evalExpr(expr, cells, visited)
    if (typeof result === 'number') {
      if (Number.isInteger(result)) return String(result)
      return parseFloat(result.toFixed(10)).toString()
    }
    return String(result)
  } catch {
    return '#ОШИБКА'
  }
}

function evalExpr(expr: string, cells: Cells, visited: Set<string>): number | string {
  const funcMatch = expr.match(/^([A-Z]+)\((.+)\)$/is)
  if (funcMatch) {
    return evalFunc(funcMatch[1].toUpperCase(), funcMatch[2], cells, visited)
  }
  return evalArith(expr, cells, visited)
}

function evalFunc(name: string, argsStr: string, cells: Cells, visited: Set<string>): number {
  const nums = expandArgs(argsStr, cells, visited)
  switch (name) {
    case 'SUM':
      return nums.reduce((a, b) => a + b, 0)
    case 'AVERAGE':
      return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0
    case 'MIN':
      return nums.length ? Math.min(...nums) : 0
    case 'MAX':
      return nums.length ? Math.max(...nums) : 0
    case 'COUNT':
      return nums.filter((n) => !isNaN(n)).length
    default:
      throw new Error(`Неизвестная функция: ${name}`)
  }
}

function expandArgs(argsStr: string, cells: Cells, visited: Set<string>): number[] {
  const args = splitArgs(argsStr)
  const result: number[] = []
  for (const arg of args) {
    const t = arg.trim().toUpperCase()
    if (/^[A-Z]+\d+:[A-Z]+\d+$/.test(t)) {
      result.push(...getCellRange(t, cells, visited))
    } else if (/^[A-Z]+\d+$/.test(t)) {
      result.push(resolveCellNum(t, cells, visited))
    } else {
      result.push(parseFloat(t) || 0)
    }
  }
  return result
}

function splitArgs(s: string): string[] {
  const result: string[] = []
  let depth = 0
  let cur = ''
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')') depth--
    else if (ch === ',' && depth === 0) {
      result.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur) result.push(cur)
  return result
}

function getCellRange(range: string, cells: Cells, visited: Set<string>): number[] {
  const [from, to] = range.split(':')
  const [fc, fr] = parseCellRef(from)
  const [tc, tr] = parseCellRef(to)
  const nums: number[] = []
  for (let r = Math.min(fr, tr); r <= Math.max(fr, tr); r++) {
    for (let c = Math.min(fc, tc); c <= Math.max(fc, tc); c++) {
      const key = `${r},${c}`
      if (visited.has(key)) {
        nums.push(0)
        continue
      }
      const cell = cells[key]
      if (!cell) {
        nums.push(0)
        continue
      }
      const v = cell.formula ? evaluateFormula(cell.formula, cells, new Set(visited)) : cell.value
      nums.push(parseFloat(v) || 0)
    }
  }
  return nums
}

function resolveCellNum(ref: string, cells: Cells, visited: Set<string>): number {
  const [col, row] = parseCellRef(ref)
  const key = `${row},${col}`
  if (visited.has(key)) return 0
  const cell = cells[key]
  if (!cell) return 0
  const newVisited = new Set(visited)
  newVisited.add(key)
  const v = cell.formula ? evaluateFormula(cell.formula, cells, newVisited) : cell.value
  return parseFloat(v) || 0
}

function parseCellRef(ref: string): [number, number] {
  const m = ref.toUpperCase().match(/^([A-Z]+)(\d+)$/)
  if (!m) throw new Error(`Неверная ссылка: ${ref}`)
  return [colToIdx(m[1]), parseInt(m[2]) - 1]
}

function colToIdx(col: string): number {
  let idx = 0
  for (const ch of col) idx = idx * 26 + (ch.charCodeAt(0) - 64)
  return idx - 1
}

function evalArith(expr: string, cells: Cells, visited: Set<string>): number | string {
  const resolved = expr.replace(/[A-Z]+\d+/gi, (ref) => {
    const [col, row] = parseCellRef(ref.toUpperCase())
    const key = `${row},${col}`
    if (visited.has(key)) return '0'
    const cell = cells[key]
    if (!cell) return '0'
    const v = cell.formula ? evaluateFormula(cell.formula, cells, new Set(visited)) : cell.value
    return String(parseFloat(v) || 0)
  })
  if (!/^[\d+\-*/().\s]+$/.test(resolved)) throw new Error('Недопустимое выражение')
  return Function(`"use strict"; return (${resolved})`)() as number
}

export function colIdxToLetter(idx: number): string {
  let s = ''
  let n = idx + 1
  while (n > 0) {
    const rem = (n - 1) % 26
    s = String.fromCharCode(65 + rem) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function cellKeyToRef(key: string): string {
  const [r, c] = key.split(',').map(Number)
  return `${colIdxToLetter(c)}${r + 1}`
}

export function refToCellKey(ref: string): string {
  const [col, row] = parseCellRef(ref.toUpperCase())
  return `${row},${col}`
}

export function formatCellDisplay(cell: CellData | undefined): string {
  if (!cell) return ''
  const val = cell.value
  const fmt = cell.format?.numFormat
  if (!fmt || fmt === 'default') return val
  const num = parseFloat(val)
  if (isNaN(num)) return val
  switch (fmt) {
    case 'percent':
      return (num * 100).toFixed(2) + '%'
    case 'currency':
      return num.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })
    case 'date': {
      const d = new Date(val)
      return isNaN(d.getTime()) ? val : d.toLocaleDateString('ru-RU')
    }
    default:
      return val
  }
}
