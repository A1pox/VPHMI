import { useEffect, useRef, useState } from 'react'
import { useBlocker, useNavigate, useParams } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/index'
import {
  clearSheet,
  loadDocument,
  redo,
  replaceSheet,
  saveDocument,
  setTitle,
  undo,
} from '@store/spreadsheetSlice'
import { setActiveDocument } from '@store/documentsSlice'
import { showNotification } from '@store/uiSlice'
import Breadcrumbs from '@components/Breadcrumbs'
import FormatToolbar from '@components/FormatToolbar'
import Notification from '@components/Notification'
import SpreadsheetGrid from '@components/SpreadsheetGrid'
import { downloadCSV, downloadJSON, exportCSV, exportJSON, parseCSV } from '@utils/export'

export default function EditorPage() {
  const { documentId } = useParams<{ documentId: string }>()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { title, rows, cols, cells, columnLabels, isDirty, loading, saving, error } =
    useAppSelector((s) => s.spreadsheet)
  const saveStatus = useAppSelector((s) => s.ui.saveStatus)
  const importRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    if (documentId) {
      dispatch(setActiveDocument(documentId))
      dispatch(loadDocument(documentId))
    }
    return () => {
      dispatch(setActiveDocument(null))
      dispatch(clearSheet())
    }
  }, [dispatch, documentId])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [isDirty])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault()
        dispatch(saveDocument())
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault()
        dispatch(undo())
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
        e.preventDefault()
        dispatch(redo())
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [dispatch])

  const blocker = useBlocker(isDirty && !saving)
  useEffect(() => {
    if (blocker.state !== 'blocked') return
    if (window.confirm('Есть несохранённые изменения. Покинуть страницу?')) {
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker])

  useEffect(() => {
    if (error?.includes('403') || error?.includes('запрещён')) {
      dispatch(showNotification({ message: 'Доступ к документу запрещён', type: 'error' }))
      navigate('/dashboard')
    }
    if (error?.includes('404') || error?.includes('не найден')) {
      dispatch(showNotification({ message: 'Документ не найден', type: 'error' }))
      navigate('/dashboard')
    }
  }, [dispatch, error, navigate])

  const handleExportCSV = () => {
    downloadCSV(exportCSV(cells, rows, cols, columnLabels), `${title || 'document'}.csv`)
    dispatch(showNotification({ message: 'CSV скачан', type: 'success' }))
  }

  const handleExportJSON = () => {
    downloadJSON(exportJSON(cells, rows, cols, title, columnLabels), `${title || 'document'}.json`)
    dispatch(showNotification({ message: 'JSON скачан', type: 'success' }))
  }

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImportError('')
    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const text = evt.target?.result as string
        const result = parseCSV(text)
        dispatch(replaceSheet(result))
        dispatch(
          showNotification({ message: `Импортировано ${result.rows} строк`, type: 'success' }),
        )
      } catch {
        setImportError('Ошибка разбора CSV')
      }
    }
    reader.readAsText(file, 'utf-8')
    if (importRef.current) importRef.current.value = ''
  }

  const saveState =
    saving || saveStatus === 'saving'
      ? 'saving'
      : saveStatus === 'error'
        ? 'error'
        : isDirty || saveStatus === 'unsaved'
          ? 'unsaved'
          : 'saved'

  const saveStatusText = () => {
    if (saveState === 'saving') return 'Сохранение...'
    if (saveState === 'error') return 'Ошибка сохранения'
    if (saveState === 'unsaved') return 'Не сохранено'
    return 'Сохранено'
  }

  if (loading) return <div className="plain-msg">Загрузка документа...</div>

  return (
    <div className="editor-page">
      <Notification />
      <div className="editor-header">
        <Breadcrumbs
          crumbs={[{ label: 'Мои документы', to: '/dashboard' }, { label: title || '...' }]}
        />
        <input
          className="title-input"
          value={title}
          onChange={(e) => dispatch(setTitle(e.target.value))}
        />
        <span className={`save-status save-status-${saveState}`}>{saveStatusText()}</span>
        <div className="editor-actions">
          <button className="btn" onClick={handleExportCSV}>
            Экспорт CSV
          </button>
          <button className="btn" onClick={handleExportJSON}>
            Экспорт JSON
          </button>
          <label className="btn file-btn">
            Импорт CSV
            <input
              ref={importRef}
              type="file"
              accept=".csv"
              style={{ display: 'none' }}
              onChange={handleImportCSV}
            />
          </label>
        </div>
      </div>

      <FormatToolbar />

      {importError && (
        <div className="error-msg" style={{ margin: '4px 8px' }}>
          {importError}
        </div>
      )}

      <SpreadsheetGrid />
    </div>
  )
}
