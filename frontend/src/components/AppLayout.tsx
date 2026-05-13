import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/index'
import { logout } from '@store/authSlice'

export default function AppLayout() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const user = useAppSelector((s) => s.auth.user)
  const isEditorRoute = location.pathname.startsWith('/documents/')

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <header className="app-header">
        <span className="app-header-title">Табличный процессор</span>
        <nav className="app-header-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            Документы
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
          >
            {user?.name ?? 'Профиль'}
          </NavLink>
        </nav>
        <button className="app-header-logout" onClick={handleLogout}>
          Выйти
        </button>
      </header>
      <div className="app-body">
        <aside className="app-sidebar">
          <div className="sidebar-section-title">Навигация</div>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            Мои документы
          </NavLink>
          <NavLink
            to="/profile"
            className={({ isActive }) => (isActive ? 'sidebar-link active' : 'sidebar-link')}
          >
            Профиль
          </NavLink>
        </aside>
        <main className={isEditorRoute ? 'app-main app-main-editor' : 'app-main'}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
