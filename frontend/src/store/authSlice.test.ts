import { describe, it, expect } from 'vitest'
import authReducer, { clearError, login, register, logout } from './authSlice'
import type { User } from '@api/client'

const mockUser: User = { id: '1', name: 'Иван', email: 'ivan@test.com' }

const initial = { user: null, loading: false, error: null, initialized: false }

describe('authSlice', () => {
  it('should return initial state', () => {
    expect(authReducer(undefined, { type: '' })).toEqual(initial)
  })

  it('clearError clears error', () => {
    const state = { ...initial, error: 'some error' }
    expect(authReducer(state, clearError())).toMatchObject({ error: null })
  })

  it('login.pending sets loading=true and clears error', () => {
    const state = { ...initial, error: 'old error' }
    const result = authReducer(state, { type: login.pending.type })
    expect(result.loading).toBe(true)
    expect(result.error).toBeNull()
  })

  it('login.fulfilled sets user and loading=false', () => {
    const result = authReducer(
      { ...initial, loading: true },
      { type: login.fulfilled.type, payload: mockUser },
    )
    expect(result.user).toEqual(mockUser)
    expect(result.loading).toBe(false)
  })

  it('login.rejected sets error and loading=false', () => {
    const result = authReducer(
      { ...initial, loading: true },
      { type: login.rejected.type, error: { message: 'Неверный пароль' } },
    )
    expect(result.loading).toBe(false)
    expect(result.error).toBe('Неверный пароль')
  })

  it('register.pending sets loading=true', () => {
    const result = authReducer(initial, { type: register.pending.type })
    expect(result.loading).toBe(true)
  })

  it('register.fulfilled sets user', () => {
    const result = authReducer(
      { ...initial, loading: true },
      { type: register.fulfilled.type, payload: mockUser },
    )
    expect(result.user).toEqual(mockUser)
  })

  it('logout.fulfilled clears user', () => {
    const state = { ...initial, user: mockUser }
    const result = authReducer(state, { type: logout.fulfilled.type })
    expect(result.user).toBeNull()
  })
})
