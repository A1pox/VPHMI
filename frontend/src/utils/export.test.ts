import { describe, expect, it } from 'vitest'
import { exportCSV, parseCSV } from './export'

describe('CSV import/export', () => {
  it('exports column labels and row numbers for spreadsheet apps', () => {
    const csv = exportCSV({ '0,0': { value: 'Alice' }, '0,1': { value: '42' } }, 1, 2, {
      0: 'Name',
      1: 'Score',
    })

    expect(csv.split('\n')[0]).toBe(',Name,Score')
    expect(csv.split('\n')[1]).toBe('1,Alice,42')
  })

  it('imports a 500-row CSV without dropping column names or sheet size', () => {
    const rows = Array.from({ length: 500 }, (_, i) => `User ${i + 1},${i + 1}`)
    const result = parseCSV(['Name,Score', ...rows].join('\n'))

    expect(result.rows).toBe(500)
    expect(result.cols).toBe(2)
    expect(result.columnLabels).toEqual({ 0: 'Name', 1: 'Score' })
    expect(result.cells['499,0']).toEqual({ value: 'User 500' })
    expect(result.cells['499,1']).toEqual({ value: '500' })
  })

  it('round-trips exported CSV with generated row-number column', () => {
    const csv = exportCSV({ '0,0': { value: 'A' } }, 1, 1)
    const result = parseCSV(csv)

    expect(result.columnLabels).toEqual({ 0: 'A' })
    expect(result.cells['0,0']).toEqual({ value: 'A' })
  })
})
