import { useAppDispatch, useAppSelector } from '@store/index'
import { getSelectionKeys, setCellFormat } from '@store/spreadsheetSlice'
import type { CellFormat } from '@store/spreadsheetSlice'

export default function FormatToolbar() {
  const dispatch = useAppDispatch()
  const { selection, cells } = useAppSelector((s) => s.spreadsheet)

  const activeCell = selection ? cells[`${selection.start.row},${selection.start.col}`] : undefined
  const fmt: CellFormat = activeCell?.format ?? {}

  const applyFormat = (partial: Partial<CellFormat>) => {
    if (!selection) return
    dispatch(setCellFormat({ keys: getSelectionKeys(selection), format: partial }))
  }

  return (
    <div className="format-toolbar">
      <button
        className={`fmt-btn${fmt.bold ? ' active' : ''}`}
        onClick={() => applyFormat({ bold: !fmt.bold })}
        title="Жирный (Ctrl+B)"
      >
        <b>B</b>
      </button>
      <button
        className={`fmt-btn${fmt.italic ? ' active' : ''}`}
        onClick={() => applyFormat({ italic: !fmt.italic })}
        title="Курсив (Ctrl+I)"
      >
        <i>I</i>
      </button>
      <button
        className={`fmt-btn${fmt.underline ? ' active' : ''}`}
        onClick={() => applyFormat({ underline: !fmt.underline })}
        title="Подчёркивание (Ctrl+U)"
      >
        <u>U</u>
      </button>

      <div className="fmt-separator" />

      <label className="fmt-color-label" title="Цвет текста">
        <span style={{ borderBottom: `3px solid ${fmt.color ?? '#000'}` }}>A</span>
        <input
          type="color"
          value={fmt.color ?? '#000000'}
          onChange={(e) => applyFormat({ color: e.target.value })}
          className="fmt-color-input"
        />
      </label>

      <label className="fmt-color-label" title="Цвет фона">
        <span className="fmt-bg-swatch" style={{ background: fmt.bgColor ?? '#fff' }}>
          ■
        </span>
        <input
          type="color"
          value={fmt.bgColor ?? '#ffffff'}
          onChange={(e) => applyFormat({ bgColor: e.target.value })}
          className="fmt-color-input"
        />
      </label>

      <div className="fmt-separator" />

      <button
        className={`fmt-btn${fmt.align === 'left' || !fmt.align ? ' active' : ''}`}
        onClick={() => applyFormat({ align: 'left' })}
        title="По левому краю"
      >
        L
      </button>
      <button
        className={`fmt-btn${fmt.align === 'center' ? ' active' : ''}`}
        onClick={() => applyFormat({ align: 'center' })}
        title="По центру"
      >
        C
      </button>
      <button
        className={`fmt-btn${fmt.align === 'right' ? ' active' : ''}`}
        onClick={() => applyFormat({ align: 'right' })}
        title="По правому краю"
      >
        R
      </button>

      <div className="fmt-separator" />

      <select
        className="fmt-select"
        value={fmt.numFormat ?? 'default'}
        onChange={(e) => applyFormat({ numFormat: e.target.value as CellFormat['numFormat'] })}
        title="Формат числа"
      >
        <option value="default">Обычный</option>
        <option value="percent">Процент</option>
        <option value="currency">Валюта</option>
        <option value="date">Дата</option>
      </select>
    </div>
  )
}
