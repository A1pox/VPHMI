import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '@store/index'

export default function ProtectedRoute() {
  const user = useAppSelector((s) => s.auth.user)
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  return <Outlet />
}
