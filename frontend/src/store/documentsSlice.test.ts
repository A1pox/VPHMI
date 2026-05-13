import { describe, it, expect } from 'vitest'
import reducer, {
  clearError,
  deleteDocument,
  fetchDocuments,
  setActiveDocument,
} from './documentsSlice'
import type { DocumentPreview } from '@api/client'

const mockDoc: DocumentPreview = {
  id: 'abc',
  title: 'Тест',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  preview: [],
}

describe('documentsSlice', () => {
  const initial = reducer(undefined, { type: '' })

  it('returns initial state', () => {
    expect(initial).toMatchObject({ list: [], activeDocumentId: null, loading: false, error: null })
  })

  it('clearError clears error', () => {
    const s = reducer({ ...initial, error: 'fail' }, clearError())
    expect(s.error).toBeNull()
  })

  it('setActiveDocument stores active document id', () => {
    const s = reducer(initial, setActiveDocument('abc'))
    expect(s.activeDocumentId).toBe('abc')
  })

  it('fetchDocuments.pending sets loading=true', () => {
    const s = reducer(initial, { type: fetchDocuments.pending.type })
    expect(s.loading).toBe(true)
  })

  it('fetchDocuments.fulfilled populates list', () => {
    const s = reducer(
      { ...initial, loading: true },
      { type: fetchDocuments.fulfilled.type, payload: [mockDoc] },
    )
    expect(s.list).toHaveLength(1)
    expect(s.list[0].id).toBe('abc')
    expect(s.loading).toBe(false)
  })

  it('fetchDocuments.rejected sets error', () => {
    const s = reducer(
      { ...initial, loading: true },
      { type: fetchDocuments.rejected.type, error: { message: 'Network error' } },
    )
    expect(s.error).toBe('Network error')
    expect(s.loading).toBe(false)
  })

  it('deleteDocument.fulfilled removes document from list', () => {
    const state = { ...initial, activeDocumentId: 'abc', list: [mockDoc] }
    const s = reducer(state, { type: deleteDocument.fulfilled.type, payload: 'abc' })
    expect(s.list).toHaveLength(0)
    expect(s.activeDocumentId).toBeNull()
  })
})
