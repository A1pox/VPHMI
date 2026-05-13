import { describe, it, expect } from 'vitest'
import uiReducer, {
  dismissNotification,
  setCreateDocumentModalOpen,
  setSaveStatus,
  showNotification,
} from './uiSlice'

describe('uiSlice', () => {
  const initial = { saveStatus: 'idle', notification: null, modals: { createDocument: false } }

  it('should return initial state', () => {
    expect(uiReducer(undefined, { type: '' })).toMatchObject(initial)
  })

  it('setSaveStatus updates saveStatus', () => {
    expect(uiReducer(undefined, setSaveStatus('saving'))).toMatchObject({ saveStatus: 'saving' })
    expect(uiReducer(undefined, setSaveStatus('saved'))).toMatchObject({ saveStatus: 'saved' })
    expect(uiReducer(undefined, setSaveStatus('error'))).toMatchObject({ saveStatus: 'error' })
  })

  it('showNotification sets notification', () => {
    const result = uiReducer(undefined, showNotification({ message: 'OK', type: 'success' }))
    expect(result.notification).toMatchObject({ message: 'OK', type: 'success' })
    expect(result.notification?.id).toBeDefined()
  })

  it('dismissNotification clears notification', () => {
    const state = {
      saveStatus: 'idle' as const,
      notification: { id: 1, message: 'X', type: 'info' as const },
      modals: { createDocument: false },
    }
    expect(uiReducer(state, dismissNotification())).toMatchObject({ notification: null })
  })

  it('setCreateDocumentModalOpen toggles create document modal', () => {
    const open = uiReducer(undefined, setCreateDocumentModalOpen(true))
    expect(open.modals.createDocument).toBe(true)

    const closed = uiReducer(open, setCreateDocumentModalOpen(false))
    expect(closed.modals.createDocument).toBe(false)
  })

  it('reacts to spreadsheet/save/pending with saving status', () => {
    const result = uiReducer(undefined, { type: 'spreadsheet/save/pending' })
    expect(result.saveStatus).toBe('saving')
  })

  it('reacts to spreadsheet/save/fulfilled with saved status', () => {
    const result = uiReducer(undefined, { type: 'spreadsheet/save/fulfilled' })
    expect(result.saveStatus).toBe('saved')
  })

  it('reacts to spreadsheet/save/rejected with error status', () => {
    const result = uiReducer(undefined, { type: 'spreadsheet/save/rejected' })
    expect(result.saveStatus).toBe('error')
  })
})
