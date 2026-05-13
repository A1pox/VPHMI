import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export type SaveStatus = 'idle' | 'unsaved' | 'saving' | 'saved' | 'error'

interface Notification {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface UiState {
  saveStatus: SaveStatus
  notification: Notification | null
  modals: {
    createDocument: boolean
  }
}

const initial: UiState = {
  saveStatus: 'idle',
  notification: null,
  modals: {
    createDocument: false,
  },
}

let notifId = 0

const uiSlice = createSlice({
  name: 'ui',
  initialState: initial,
  reducers: {
    setSaveStatus(state, a: PayloadAction<SaveStatus>) {
      state.saveStatus = a.payload
    },
    showNotification(state, a: PayloadAction<{ message: string; type: Notification['type'] }>) {
      state.notification = { id: ++notifId, ...a.payload }
    },
    dismissNotification(state) {
      state.notification = null
    },
    setCreateDocumentModalOpen(state, a: PayloadAction<boolean>) {
      state.modals.createDocument = a.payload
    },
  },
  extraReducers: (b) => {
    b.addMatcher(
      (action) => action.type === 'spreadsheet/save/pending',
      (state) => {
        state.saveStatus = 'saving'
      },
    )
    b.addMatcher(
      (action) => action.type === 'spreadsheet/save/fulfilled',
      (state) => {
        state.saveStatus = 'saved'
      },
    )
    b.addMatcher(
      (action) => action.type === 'spreadsheet/save/rejected',
      (state) => {
        state.saveStatus = 'error'
      },
    )
  },
})

export const { setSaveStatus, showNotification, dismissNotification, setCreateDocumentModalOpen } =
  uiSlice.actions
export default uiSlice.reducer
