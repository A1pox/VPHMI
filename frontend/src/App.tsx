import { useEffect } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '@components/AppLayout'
import ProtectedRoute from '@components/ProtectedRoute'
import { useAppDispatch, useAppSelector } from '@store/index'
import { initializeAuth } from '@store/authSlice'
import DocumentsPage from '@pages/DocumentsPage'
import EditorPage from '@pages/EditorPage'
import LoginPage from '@pages/LoginPage'
import NotFoundPage from '@pages/NotFoundPage'
import ProfilePage from '@pages/ProfilePage'
import RegisterPage from '@pages/RegisterPage'

export default function App() {
  const dispatch = useAppDispatch()
  const initialized = useAppSelector((s) => s.auth.initialized)

  useEffect(() => {
    dispatch(initializeAuth())
  }, [dispatch])

  if (!initialized) return <div style={{ padding: 20 }}>Загрузка...</div>

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<DocumentsPage />} />
          <Route path="/documents/:documentId" element={<EditorPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
