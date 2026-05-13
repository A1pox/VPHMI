import { Link, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/index'
import { logout } from '@store/authSlice'

export default function Navbar() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const user = useAppSelector((s) => s.auth.user)

  const handleLogout = async () => {
    await dispatch(logout())
    navigate('/login')
  }

  return (
    <div className="navbar">
      <span className="navbar-title">Табличный процессор</span>
      <Link to="/">Документы</Link>
      <Link to="/profile">{user?.name ?? 'Профиль'}</Link>
      <button className="navbar-btn" onClick={handleLogout}>
        Выйти
      </button>
    </div>
  )
}
