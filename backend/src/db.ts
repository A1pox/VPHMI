import Database from 'better-sqlite3'
import path from 'node:path'

export interface UserRow {
  id: string
  name: string
  email: string
  password: string
  created_at: string
}

export interface PublicUser {
  id: string
  name: string
  email: string
  created_at: string
}

export interface DocumentRow {
  id: string
  user_id: string
  title: string
  data: string
  created_at: string
  updated_at: string
}

export interface DocumentPreview {
  id: string
  title: string
  created_at: string
  updated_at: string
  preview: string[][]
}

export const db = new Database(path.resolve(process.cwd(), 'db.sqlite'))

db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    password   TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS documents (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    title      TEXT NOT NULL,
    data       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`)

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    created_at: user.created_at,
  }
}

export function findUserByEmail(email: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as UserRow | undefined
}

export function findUserById(id: string): UserRow | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as UserRow | undefined
}

export function insertUser(user: UserRow): void {
  db.prepare(
    `
      INSERT INTO users (id, name, email, password, created_at)
      VALUES (@id, @name, @email, @password, @created_at)
    `,
  ).run(user)
}

export function updateUserName(userId: string, name: string): UserRow | undefined {
  db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name, userId)
  return findUserById(userId)
}

export function updateUserEmail(userId: string, email: string): UserRow | undefined {
  db.prepare('UPDATE users SET email = ? WHERE id = ?').run(email, userId)
  return findUserById(userId)
}

export function updateUserPassword(userId: string, passwordHash: string): void {
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(passwordHash, userId)
}

export function countDocumentsForUser(userId: string): number {
  const row = db
    .prepare('SELECT COUNT(*) as count FROM documents WHERE user_id = ?')
    .get(userId) as { count: number }
  return row.count
}

export function listDocumentsByUser(userId: string): DocumentRow[] {
  return db
    .prepare('SELECT * FROM documents WHERE user_id = ? ORDER BY updated_at DESC')
    .all(userId) as DocumentRow[]
}

export function findDocumentById(id: string): DocumentRow | undefined {
  return db.prepare('SELECT * FROM documents WHERE id = ?').get(id) as DocumentRow | undefined
}

export function insertDocument(doc: DocumentRow): void {
  db.prepare(
    `
      INSERT INTO documents (id, user_id, title, data, created_at, updated_at)
      VALUES (@id, @user_id, @title, @data, @created_at, @updated_at)
    `,
  ).run(doc)
}

export function updateDocument(
  id: string,
  patch: { title?: string; data?: string; updated_at: string },
): DocumentRow | undefined {
  const existing = findDocumentById(id)
  if (!existing) return undefined

  db.prepare(
    `
      UPDATE documents
      SET title = @title,
          data = @data,
          updated_at = @updated_at
      WHERE id = @id
    `,
  ).run({
    id,
    title: patch.title ?? existing.title,
    data: patch.data ?? existing.data,
    updated_at: patch.updated_at,
  })

  return findDocumentById(id)
}

export function deleteDocument(id: string): void {
  db.prepare('DELETE FROM documents WHERE id = ?').run(id)
}
