import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '@store/index'
import { clearError, register } from '@store/authSlice'

export default function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { loading, error, user } = useAppSelector((s) => s.auth)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [formError, setFormError] = useState('')

  useEffect(() => {
    dispatch(clearError())
  }, [dispatch])

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [navigate, user])

  const validate = (): boolean => {
    if (!name.trim()) {
      setFormError('Введите имя')
      return false
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Введите корректный email')
      return false
    }
    if (password.length < 8) {
      setFormError('Пароль должен быть не менее 8 символов')
      return false
    }
    if (password !== confirm) {
      setFormError('Пароли не совпадают')
      return false
    }
    setFormError('')
    return true
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    dispatch(register({ name, email, password }))
  }

  return (
    <div className="form-page">
      <form className="form-box" onSubmit={handleSubmit}>
        <h1>Регистрация</h1>
        {(formError || error) && <div className="error-msg">{formError || error}</div>}
        <label>Имя</label>
        <input
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            setFormError('')
          }}
          required
          autoFocus
        />
        <label>Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            setFormError('')
          }}
          required
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
          minLength={8}
        />
        <label>Подтверждение пароля</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value)
            setFormError('')
          }}
          required
          minLength={8}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Загрузка...' : 'Создать аккаунт'}
        </button>
        <button type="button" className="text-button" onClick={() => navigate('/login')}>
          Вход
        </button>
      </form>
    </div>
  )
}
