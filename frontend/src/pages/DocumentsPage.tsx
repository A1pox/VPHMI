import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/index'
import {
  createDocument,
  deleteDocument,
  duplicateDocument,
  fetchDocuments,
  renameDocument,
} from '@store/documentsSlice'
import { setCreateDocumentModalOpen, showNotification } from '@store/uiSlice'
import Notification from '@components/Notification'

export default function DocumentsPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { list, loading, error } = useAppSelector((s) => s.documents)
  const isCreateModalOpen = useAppSelector((s) => s.ui.modals.createDocument)

  const [newTitle, setNewTitle] = useState('')
  const [newRows, setNewRows] = useState(100)
  const [newCols, setNewCols] = useState(26)
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    dispatch(fetchDocuments())
  }, [dispatch])

  useEffect(() => {
    if (renamingId) renameRef.current?.focus()
  }, [renamingId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await dispatch(
        createDocument({
          title: newTitle.trim() || 'Новый документ',
          rows: newRows,
          cols: newCols,
        }),
      ).unwrap()
      dispatch(setCreateDocumentModalOpen(false))
      setNewTitle('')
      navigate(`/documents/${res.id}`)
    } catch {
      dispatch(showNotification({ message: 'Ошибка создания документа', type: 'error' }))
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Удалить документ?')) return
    try {
      await dispatch(deleteDocument(id)).unwrap()
      dispatch(showNotification({ message: 'Документ удалён', type: 'success' }))
    } catch {
      dispatch(showNotification({ message: 'Ошибка удаления', type: 'error' }))
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      await dispatch(duplicateDocument(id)).unwrap()
      dispatch(showNotification({ message: 'Документ скопирован', type: 'success' }))
    } catch {
      dispatch(showNotification({ message: 'Ошибка копирования', type: 'error' }))
    }
  }

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id)
    setRenameValue(currentTitle)
  }

  const commitRename = async () => {
    if (!renamingId) return
    const trimmed = renameValue.trim()
    if (trimmed) {
      try {
        await dispatch(renameDocument({ id: renamingId, title: trimmed })).unwrap()
      } catch {
        dispatch(showNotification({ message: 'Ошибка переименования', type: 'error' }))
      }
    }
    setRenamingId(null)
  }

  const formatDate = (value: string) => new Date(value).toLocaleDateString('ru-RU')

  const renderPreview = (preview: string[][] | undefined) => {
    const rows = Array.from({ length: 3 }, (_, r) => (preview ?? [])[r] ?? [])
    return (
      <table className="doc-preview-table" aria-label="Превью документа">
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {Array.from({ length: 3 }, (_, c) => (
                <td key={c}>{row[c] ?? ''}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    )
  }

  return (
    <>
      <Notification />
      <h1>Мои документы</h1>

      <div className="page-actions">
        <button
          className="btn btn-primary"
          onClick={() => dispatch(setCreateDocumentModalOpen(true))}
        >
          Создать
        </button>
      </div>

      {error && <div className="error-msg">{error}</div>}
      {loading && <div className="plain-msg">Загрузка...</div>}
      {!loading && list.length === 0 && <div className="plain-msg">Документов нет.</div>}

      {list.length > 0 && (
        <table className="documents-table">
          <thead>
            <tr>
              <th>Название</th>
              <th>Создан</th>
              <th>Изменён</th>
              <th>Превью</th>
              <th>Действия</th>
            </tr>
          </thead>
          <tbody>
            {list.map((doc) => (
              <tr key={doc.id}>
                <td>
                  {renamingId === doc.id ? (
                    <input
                      ref={renameRef}
                      className="inline-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitRename()
                        if (e.key === 'Escape') setRenamingId(null)
                      }}
                    />
                  ) : (
                    <button
                      className="text-button"
                      onClick={() => navigate(`/documents/${doc.id}`)}
                    >
                      {doc.title}
                    </button>
                  )}
                </td>
                <td>{formatDate(doc.created_at)}</td>
                <td>{formatDate(doc.updated_at)}</td>
                <td>{renderPreview(doc.preview)}</td>
                <td>
                  <div className="row-actions">
                    <button className="btn" onClick={() => startRename(doc.id, doc.title)}>
                      Переименовать
                    </button>
                    <button className="btn" onClick={() => handleDuplicate(doc.id)}>
                      Дублировать
                    </button>
                    <button className="btn btn-danger" onClick={() => handleDelete(doc.id)}>
                      Удалить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => dispatch(setCreateDocumentModalOpen(false))}>
          <form className="modal" onSubmit={handleCreate} onClick={(e) => e.stopPropagation()}>
            <h2>Новый документ</h2>
            <label>Название</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Новый документ"
              autoFocus
            />
            <label>Строк</label>
            <input
              type="number"
              value={newRows}
              onChange={(e) => setNewRows(Number(e.target.value))}
              min={1}
              max={1000}
            />
            <label>Столбцов</label>
            <input
              type="number"
              value={newCols}
              onChange={(e) => setNewCols(Math.min(26, Number(e.target.value)))}
              min={1}
              max={26}
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn"
                onClick={() => dispatch(setCreateDocumentModalOpen(false))}
              >
                Отмена
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Создание...' : 'Создать'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
