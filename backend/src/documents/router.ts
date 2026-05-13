import { randomUUID } from 'node:crypto'
import type { Response } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import {
  deleteDocument,
  findDocumentById,
  insertDocument,
  listDocumentsByUser,
  updateDocument,
  type DocumentPreview,
  type DocumentRow,
} from '../db'
import { getAuthUser, requireAuth, type AuthRequest } from '../auth/middleware'

interface CellDataLike {
  value?: unknown
}

interface SpreadsheetDataLike {
  rows?: unknown
  cols?: unknown
  cells?: unknown
  grid?: unknown
}

const createDocumentSchema = z.object({
  title: z.string().trim().min(1).default('Новый документ'),
  rows: z.number().int().min(1).max(1000).default(100),
  cols: z.number().int().min(1).max(26).default(26),
})

const updateDocumentSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    data: z.string().optional(),
  })
  .refine((value) => value.title !== undefined || value.data !== undefined, {
    message: 'title или data обязательны',
  })

export const documentsRouter = Router()

documentsRouter.use(requireAuth)

documentsRouter.get('/', (req: AuthRequest, res) => {
  const authUser = getAuthUser(req)
  const docs = listDocumentsByUser(authUser.userId).map(toPreview)
  res.json(docs)
})

documentsRouter.post('/', (req: AuthRequest, res) => {
  const parsed = createDocumentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Невалидные поля', issues: parsed.error.flatten() })
    return
  }

  const authUser = getAuthUser(req)
  const now = new Date().toISOString()
  const doc: DocumentRow = {
    id: randomUUID(),
    user_id: authUser.userId,
    title: parsed.data.title,
    data: JSON.stringify({ rows: parsed.data.rows, cols: parsed.data.cols, cells: {} }),
    created_at: now,
    updated_at: now,
  }

  insertDocument(doc)
  res.status(201).json(toFullDocument(doc))
})

documentsRouter.get('/:id', (req: AuthRequest, res) => {
  const result = getOwnedDocument(req, res)
  if (!result) return
  res.json(toFullDocument(result))
})

documentsRouter.patch('/:id', (req: AuthRequest, res) => {
  const result = getOwnedDocument(req, res)
  if (!result) return

  const parsed = updateDocumentSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ message: 'Невалидные поля', issues: parsed.error.flatten() })
    return
  }

  const updated = updateDocument(result.id, {
    title: parsed.data.title,
    data: parsed.data.data,
    updated_at: new Date().toISOString(),
  })

  if (!updated) {
    res.status(404).json({ message: 'Документ не найден' })
    return
  }

  res.json(toFullDocument(updated))
})

documentsRouter.delete('/:id', (req: AuthRequest, res) => {
  const result = getOwnedDocument(req, res)
  if (!result) return

  deleteDocument(result.id)
  res.status(204).send()
})

function getOwnedDocument(req: AuthRequest, res: Response): DocumentRow | null {
  const doc = findDocumentById(req.params.id)
  if (!doc) {
    res.status(404).json({ message: 'Документ не найден' })
    return null
  }

  const authUser = getAuthUser(req)
  if (doc.user_id !== authUser.userId) {
    res.status(403).json({ message: 'Доступ запрещён' })
    return null
  }

  return doc
}

function toFullDocument(doc: DocumentRow) {
  return {
    id: doc.id,
    title: doc.title,
    data: doc.data,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
  }
}

function toPreview(doc: DocumentRow): DocumentPreview {
  return {
    id: doc.id,
    title: doc.title,
    created_at: doc.created_at,
    updated_at: doc.updated_at,
    preview: buildPreview(doc.data),
  }
}

function buildPreview(data: string): string[][] {
  const preview = Array.from({ length: 3 }, () => Array.from({ length: 3 }, () => ''))

  try {
    const parsed = JSON.parse(data) as SpreadsheetDataLike
    if (Array.isArray(parsed.grid)) {
      for (let row = 0; row < 3; row++) {
        const sourceRow = parsed.grid[row]
        if (!Array.isArray(sourceRow)) continue
        for (let col = 0; col < 3; col++) {
          preview[row][col] = stringifyCellValue(sourceRow[col])
        }
      }
      return preview
    }

    if (!isRecord(parsed.cells)) return preview
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const cell = parsed.cells[`${row},${col}`]
        if (isCellDataLike(cell)) preview[row][col] = stringifyCellValue(cell.value)
      }
    }
  } catch {
    return preview
  }

  return preview
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isCellDataLike(value: unknown): value is CellDataLike {
  return isRecord(value) && 'value' in value
}

function stringifyCellValue(value: unknown): string {
  if (value === null || value === undefined) return ''
  return String(value)
}
