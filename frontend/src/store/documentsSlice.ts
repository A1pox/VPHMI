import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit'
import * as api from '@api/client'

interface DocumentsState {
  list: api.DocumentPreview[]
  activeDocumentId: string | null
  loading: boolean
  error: string | null
}

const initial: DocumentsState = {
  list: [],
  activeDocumentId: null,
  loading: false,
  error: null,
}

export const fetchDocuments = createAsyncThunk('documents/fetchAll', () => api.getDocuments())

export const createDocument = createAsyncThunk(
  'documents/create',
  (p: { title: string; rows: number; cols: number }) => api.createDocument(p.title, p.rows, p.cols),
)

export const deleteDocument = createAsyncThunk('documents/delete', async (id: string) => {
  await api.deleteDocument(id)
  return id
})

export const duplicateDocument = createAsyncThunk('documents/duplicate', async (id: string) => {
  const doc = await api.getDocument(id)
  return api.createDocument(`${doc.title} (копия)`, 100, 26).then(async (newDoc) => {
    await api.updateDocument(newDoc.id, { data: doc.data })
    return api.getDocuments()
  })
})

export const renameDocument = createAsyncThunk(
  'documents/rename',
  async (p: { id: string; title: string }) => {
    const updated = await api.updateDocument(p.id, { title: p.title })
    return updated
  },
)

const documentsSlice = createSlice({
  name: 'documents',
  initialState: initial,
  reducers: {
    clearError(state) {
      state.error = null
    },
    setActiveDocument(state, a: PayloadAction<string | null>) {
      state.activeDocumentId = a.payload
    },
    updateDocumentInList(state, a: PayloadAction<{ id: string; title: string }>) {
      const doc = state.list.find((d) => d.id === a.payload.id)
      if (doc) doc.title = a.payload.title
    },
  },
  extraReducers: (b) => {
    b.addCase(fetchDocuments.pending, (state) => {
      state.loading = true
      state.error = null
    })
    b.addCase(fetchDocuments.fulfilled, (state, a) => {
      state.loading = false
      state.list = a.payload
    })
    b.addCase(fetchDocuments.rejected, (state, a) => {
      state.loading = false
      state.error = a.error.message ?? 'Ошибка'
    })

    b.addCase(createDocument.pending, (state) => {
      state.loading = true
      state.error = null
    })
    b.addCase(createDocument.fulfilled, (state) => {
      state.loading = false
    })
    b.addCase(createDocument.rejected, (state, a) => {
      state.loading = false
      state.error = a.error.message ?? 'Ошибка создания'
    })

    b.addCase(deleteDocument.pending, (state) => {
      state.loading = true
      state.error = null
    })
    b.addCase(deleteDocument.fulfilled, (state, a) => {
      state.loading = false
      state.list = state.list.filter((d) => d.id !== a.payload)
      if (state.activeDocumentId === a.payload) state.activeDocumentId = null
    })
    b.addCase(deleteDocument.rejected, (state, a) => {
      state.loading = false
      state.error = a.error.message ?? 'Ошибка удаления'
    })

    b.addCase(duplicateDocument.pending, (state) => {
      state.loading = true
      state.error = null
    })
    b.addCase(duplicateDocument.fulfilled, (state, a) => {
      state.loading = false
      state.list = a.payload
    })
    b.addCase(duplicateDocument.rejected, (state, a) => {
      state.loading = false
      state.error = a.error.message ?? 'Ошибка копирования'
    })

    b.addCase(renameDocument.pending, (state) => {
      state.loading = true
      state.error = null
    })
    b.addCase(renameDocument.fulfilled, (state, a) => {
      state.loading = false
      const doc = state.list.find((d) => d.id === a.payload.id)
      if (doc) doc.title = a.payload.title
    })
    b.addCase(renameDocument.rejected, (state, a) => {
      state.loading = false
      state.error = a.error.message ?? 'Ошибка переименования'
    })
  },
})

export const { clearError, setActiveDocument, updateDocumentInList } = documentsSlice.actions
export default documentsSlice.reducer
