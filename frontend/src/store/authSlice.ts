import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import * as api from '@api/client'

interface AuthState {
  user: api.User | null
  loading: boolean
  error: string | null
  initialized: boolean
}

const initial: AuthState = { user: null, loading: false, error: null, initialized: false }

export const initializeAuth = createAsyncThunk('auth/initialize', async () => {
  const rt = api.getStoredRefreshToken()
  if (!rt) return null
  try {
    await api.refreshAccessToken()
    return api.getMe()
  } catch {
    api.clearAllTokens()
    return null
  }
})

export const register = createAsyncThunk(
  'auth/register',
  async (p: { name: string; email: string; password: string }) => {
    const res = await api.register(p.name, p.email, p.password)
    api.setInMemoryAccessToken(res.accessToken)
    api.setStoredRefreshToken(res.refreshToken)
    return res.user
  },
)

export const login = createAsyncThunk(
  'auth/login',
  async (p: { email: string; password: string }) => {
    const res = await api.login(p.email, p.password)
    api.setInMemoryAccessToken(res.accessToken)
    api.setStoredRefreshToken(res.refreshToken)
    return res.user
  },
)

export const logout = createAsyncThunk('auth/logout', async () => {
  await api.logout()
  api.clearAllTokens()
})

export const updateMe = createAsyncThunk('auth/updateMe', async (data: { name?: string }) =>
  api.updateMe(data),
)

const authSlice = createSlice({
  name: 'auth',
  initialState: initial,
  reducers: {
    clearError(state) {
      state.error = null
    },
  },
  extraReducers: (b) => {
    b.addCase(initializeAuth.fulfilled, (state, a) => {
      state.user = a.payload ?? null
      state.initialized = true
    })
    b.addCase(initializeAuth.rejected, (state) => {
      state.user = null
      state.initialized = true
    })

    b.addCase(register.pending, (state) => {
      state.loading = true
      state.error = null
    })
    b.addCase(register.fulfilled, (state, a) => {
      state.loading = false
      state.user = a.payload
    })
    b.addCase(register.rejected, (state, a) => {
      state.loading = false
      state.error = a.error.message ?? 'Ошибка'
    })

    b.addCase(login.pending, (state) => {
      state.loading = true
      state.error = null
    })
    b.addCase(login.fulfilled, (state, a) => {
      state.loading = false
      state.user = a.payload
    })
    b.addCase(login.rejected, (state, a) => {
      state.loading = false
      state.error = a.error.message ?? 'Ошибка'
    })

    b.addCase(logout.fulfilled, (state) => {
      state.user = null
    })

    b.addCase(updateMe.fulfilled, (state, a) => {
      state.user = a.payload
    })
  },
})

export const { clearError } = authSlice.actions
export default authSlice.reducer
