import { configureStore } from '@reduxjs/toolkit'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import authReducer, { initializeAuth, login as loginThunk } from '@store/authSlice'
import * as api from './client'

type FetchHandler = (url: string, init?: RequestInit) => Promise<Response>

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function getAuthHeader(init?: RequestInit): string {
  const headers = init?.headers as Record<string, string> | undefined
  return headers?.Authorization ?? ''
}

describe('api client with server stubs', () => {
  let handler: FetchHandler

  beforeEach(() => {
    localStorage.clear()
    api.clearAllTokens()

    handler = async () => jsonResponse({ message: 'Not found' }, 404)
    vi.stubGlobal(
      'fetch',
      vi.fn((input: RequestInfo | URL, init?: RequestInit) => handler(String(input), init)),
    )
  })

  it('logs in through a mocked server and stores access/refresh tokens correctly', async () => {
    handler = async (url, init) => {
      if (url.endsWith('/auth/login') && init?.method === 'POST') {
        return jsonResponse({
          accessToken: 'access-user-1',
          refreshToken: 'refresh-user-1',
          user: { id: 'u1', name: 'Ivan', email: 'ivan@test.dev' },
        })
      }
      return jsonResponse({ message: 'Unexpected request' }, 500)
    }
    const store = configureStore({ reducer: { auth: authReducer } })

    const user = await store
      .dispatch(
        loginThunk({
          email: 'ivan@test.dev',
          password: '12345678',
        }),
      )
      .unwrap()

    expect(user.email).toBe('ivan@test.dev')
    expect(api.getInMemoryAccessToken()).toBe('access-user-1')
    expect(api.getStoredRefreshToken()).toBe('refresh-user-1')
  })

  it('initializes auth by refreshing the access token and loading the current user', async () => {
    api.setStoredRefreshToken('refresh-user-1')
    handler = async (url) => {
      if (url.endsWith('/auth/refresh')) return jsonResponse({ accessToken: 'access-user-1' })
      if (url.endsWith('/users/me')) {
        return jsonResponse({
          id: 'u1',
          name: 'Ivan',
          email: 'ivan@test.dev',
          documentsCount: 2,
        })
      }
      return jsonResponse({ message: 'Unexpected request' }, 500)
    }
    const store = configureStore({ reducer: { auth: authReducer } })

    const user = await store.dispatch(initializeAuth()).unwrap()

    expect(user?.id).toBe('u1')
    expect(api.getInMemoryAccessToken()).toBe('access-user-1')
  })

  it('refreshes an expired access token and retries PATCH /documents/:id', async () => {
    api.setInMemoryAccessToken('expired-access')
    api.setStoredRefreshToken('refresh-user-1')
    const seenAuthHeaders: string[] = []

    handler = async (url, init) => {
      if (url.endsWith('/documents/doc-1') && init?.method === 'PATCH') {
        seenAuthHeaders.push(getAuthHeader(init))
        if (seenAuthHeaders.length === 1) return jsonResponse({ message: 'Expired' }, 401)
        return jsonResponse({
          id: 'doc-1',
          title: 'Budget',
          data: '{"rows":1,"cols":1,"cells":{}}',
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-01T00:00:00.000Z',
        })
      }
      if (url.endsWith('/auth/refresh')) return jsonResponse({ accessToken: 'fresh-access' })
      return jsonResponse({ message: 'Unexpected request' }, 500)
    }

    const updated = await api.updateDocument('doc-1', { title: 'Budget' })

    expect(updated.id).toBe('doc-1')
    expect(seenAuthHeaders).toEqual(['Bearer expired-access', 'Bearer fresh-access'])
  })

  it('returns only current user documents when the mocked server filters by token', async () => {
    api.setInMemoryAccessToken('access-user-1')
    handler = async (url, init) => {
      if (url.endsWith('/documents') && init?.method === 'GET') {
        const token = getAuthHeader(init)
        const docs =
          token === 'Bearer access-user-1'
            ? [
                {
                  id: 'doc-own',
                  title: 'Own doc',
                  created_at: '2026-01-01T00:00:00.000Z',
                  updated_at: '2026-01-01T00:00:00.000Z',
                  preview: [['1']],
                },
              ]
            : []
        return jsonResponse(docs)
      }
      return jsonResponse({ message: 'Unexpected request' }, 500)
    }

    const docs = await api.getDocuments()

    expect(docs).toHaveLength(1)
    expect(docs[0].id).toBe('doc-own')
  })

  it('maps a 403 from another user document to an authorization error', async () => {
    api.setInMemoryAccessToken('access-user-1')
    handler = async (url) => {
      if (url.endsWith('/documents/doc-foreign')) {
        return jsonResponse({ message: 'Forbidden' }, 403)
      }
      return jsonResponse({ message: 'Unexpected request' }, 500)
    }

    await expect(api.getDocument('doc-foreign')).rejects.toThrow('Доступ запрещён')
  })
})
