const BASE = 'http://localhost:3001'

// Access token stored in-memory (not localStorage) — safer against XSS
let inMemoryAccessToken: string | null = null

export function setInMemoryAccessToken(t: string) {
  inMemoryAccessToken = t
}
export function getInMemoryAccessToken() {
  return inMemoryAccessToken
}
export function clearInMemoryAccessToken() {
  inMemoryAccessToken = null
}

export function getStoredRefreshToken() {
  return localStorage.getItem('refreshToken')
}
export function setStoredRefreshToken(t: string) {
  localStorage.setItem('refreshToken', t)
}
export function clearStoredRefreshToken() {
  localStorage.removeItem('refreshToken')
}

export function clearAllTokens() {
  clearInMemoryAccessToken()
  clearStoredRefreshToken()
}

export async function refreshAccessToken(): Promise<string> {
  const rt = getStoredRefreshToken()
  if (!rt) throw new Error('No refresh token')
  const res = await fetch(`${BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: rt }),
  })
  if (!res.ok) {
    clearAllTokens()
    throw new Error('Refresh failed')
  }
  const data = (await res.json()) as { accessToken: string }
  setInMemoryAccessToken(data.accessToken)
  return data.accessToken
}

async function req(method: string, path: string, body?: unknown, retry = true): Promise<Response> {
  const headers: Record<string, string> = {}
  if (body !== undefined) headers['Content-Type'] = 'application/json'
  const at = getInMemoryAccessToken()
  if (at) headers['Authorization'] = `Bearer ${at}`

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401 && retry) {
    try {
      await refreshAccessToken()
      return req(method, path, body, false)
    } catch {
      clearAllTokens()
    }
  }
  return res
}

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = `HTTP ${res.status}`
    try {
      const d = (await res.json()) as { message?: string; error?: string }
      msg = d.message ?? d.error ?? msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  return res.json() as Promise<T>
}

// ── Auth ──

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export async function register(
  name: string,
  email: string,
  password: string,
): Promise<AuthResponse> {
  return json(await req('POST', '/auth/register', { name, email, password }))
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return json(await req('POST', '/auth/login', { email, password }))
}

export async function logout(): Promise<void> {
  await req('POST', '/auth/logout')
}

// ── Users ──

export interface User {
  id: string
  name: string
  email: string
  created_at?: string
  documentsCount?: number
}

export async function getMe(): Promise<User> {
  return json(await req('GET', '/users/me'))
}

export async function updateMe(data: { name?: string }): Promise<User> {
  return json(await req('PATCH', '/users/me', data))
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  const res = await req('POST', '/users/me/change-password', { currentPassword, newPassword })
  if (!res.ok && res.status !== 204) {
    let msg = `HTTP ${res.status}`
    try {
      const d = (await res.json()) as { message?: string; error?: string }
      msg = d.message ?? d.error ?? msg
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
}

// ── Documents ──

export interface DocumentPreview {
  id: string
  title: string
  created_at: string
  updated_at: string
  preview: string[][]
}

export interface DocumentFull {
  id: string
  title: string
  data: string
  created_at: string
  updated_at: string
}

export async function getDocuments(): Promise<DocumentPreview[]> {
  return json(await req('GET', '/documents'))
}

export async function createDocument(
  title: string,
  rows: number,
  cols: number,
): Promise<DocumentFull> {
  return json(await req('POST', '/documents', { title, rows, cols }))
}

export async function getDocument(id: string): Promise<DocumentFull> {
  const res = await req('GET', `/documents/${id}`)
  if (res.status === 403) throw Object.assign(new Error('Доступ запрещён'), { status: 403 })
  if (res.status === 404) throw Object.assign(new Error('Документ не найден'), { status: 404 })
  return json<DocumentFull>(res)
}

export async function updateDocument(
  id: string,
  data: { title?: string; data?: string },
): Promise<DocumentFull> {
  return json(await req('PATCH', `/documents/${id}`, data))
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await req('DELETE', `/documents/${id}`)
  if (!res.ok && res.status !== 204) {
    throw new Error(`HTTP ${res.status}`)
  }
}
