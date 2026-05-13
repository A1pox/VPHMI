import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/index'
import { clearError, login } from '@store/authSlice'

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { loading, error, user } = useAppSelector((s) => s.auth)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [formError, setFormError] = useState('')

  const from = (location.state as { from?: string })?.from ?? '/dashboard'

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  useEffect(() => {
    if (user) navigate(from, { replace: true })
  }, [from, navigate, user])

  const validate = (): boolean => {
    if (!email.includes('@')) {
      setFormError('Введите корректный email')
      return false
    }
    if (password.length < 8) {
      setFormError('Пароль должен быть не менее 8 символов')
      return false
    }
    setFormError('')
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    dispatch(login({ email, password }))
  }

  return (
    <div className="form-page">
      <form className="form-box" onSubmit={handleSubmit}>
        <h1>Вход</h1>
        {(formError || error) && <div className="error-msg">{formError || error}</div>}
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setFormError('')
          }}
          required
          autoFocus
        />
        <label>Пароль</label>
        <input
          type="password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value)
            setFormError('')
          }}
          required
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Загрузка...' : 'Войти'}
        </button>
        <button type="button" className="text-button" onClick={() => navigate('/register')}>
          Регистрация
        </button>
      </form>
    </div>
  )
}
