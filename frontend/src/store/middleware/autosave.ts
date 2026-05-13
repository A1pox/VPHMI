import type { Middleware, ThunkDispatch, UnknownAction } from '@reduxjs/toolkit'
import { saveDocument } from '@store/spreadsheetSlice'
import { setSaveStatus } from '@store/uiSlice'

const DEBOUNCE_MS = 500

const TRIGGER_ACTIONS = new Set([
  'spreadsheet/setCell',
  'spreadsheet/setCells',
  'spreadsheet/replaceSheet',
  'spreadsheet/clearSelection',
  'spreadsheet/setCellFormat',
  'spreadsheet/setTitle',
  'spreadsheet/setColWidth',
  'spreadsheet/setRowHeight',
  'spreadsheet/addRow',
  'spreadsheet/deleteRow',
  'spreadsheet/addCol',
  'spreadsheet/deleteCol',
  'spreadsheet/undo',
  'spreadsheet/redo',
  'spreadsheet/pasteClipboard',
])

let timer: ReturnType<typeof setTimeout> | null = null

type AutosaveDispatch = ThunkDispatch<unknown, unknown, UnknownAction>

export const autosaveMiddleware: Middleware<object, unknown, AutosaveDispatch> =
  (store) => (next) => (action) => {
    const result = next(action)

    const actionType = (action as UnknownAction).type
    if (TRIGGER_ACTIONS.has(actionType)) {
      store.dispatch(setSaveStatus('unsaved'))
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        store.dispatch(saveDocument())
      }, DEBOUNCE_MS)
    }

    return result
  }
