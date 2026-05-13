import { useEffect, useState } from 'react'
import * as api from '@api/client'
import Notification from '@components/Notification'
import { useAppDispatch, useAppSelector } from '@store/index'
import { updateMe } from '@store/authSlice'
import { showNotification } from '@store/uiSlice'

export default function ProfilePage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)

  const [name, setName] = useState(user?.name ?? '')
  const [nameSaving, setNameSaving] = useState(false)
  const [currentPwd, setCurrentPwd] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [pwdError, setPwdError] = useState('')
  const [pwdSaving, setPwdSaving] = useState(false)

  useEffect(() => {
    setName(user?.name ?? '')
  }, [user?.name])

  const handleNameSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setNameSaving(true)
    try {
      await dispatch(updateMe({ name })).unwrap()
      dispatch(showNotification({ message: 'Имя обновлено', type: 'success' }))
    } catch {
      dispatch(showNotification({ message: 'Ошибка обновления имени', type: 'error' }))
    } finally {
      setNameSaving(false)
    }
  }

  const handlePwdSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPwdError('')
    if (newPwd.length < 8) {
      setPwdError('Минимум 8 символов')
      return
    }
    setPwdSaving(true)
    try {
      await api.changePassword(currentPwd, newPwd)
      dispatch(showNotification({ message: 'Пароль изменён', type: 'success' }))
      setCurrentPwd('')
      setNewPwd('')
    } catch (err: unknown) {
      setPwdError(err instanceof Error ? err.message : 'Ошибка')
    } finally {
      setPwdSaving(false)
    }
  }

  const formatDate = (value?: string) => (value ? new Date(value).toLocaleDateString('ru-RU') : '-')

  return (
    <>
      <Notification />
      <h1>Профиль</h1>

      <table className="profile-table">
        <tbody>
          <tr>
            <th>Имя</th>
            <td>{user?.name ?? '-'}</td>
          </tr>
          <tr>
            <th>Email</th>
            <td>{user?.email ?? '-'}</td>
          </tr>
          <tr>
            <th>Документов</th>
            <td>{user?.documentsCount ?? '-'}</td>
          </tr>
          <tr>
            <th>Дата регистрации</th>
            <td>{formatDate(user?.created_at)}</td>
          </tr>
        </tbody>
      </table>

      <h2>Изменить имя</h2>
      <form className="plain-form" onSubmit={handleNameSave}>
        <label>Имя</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} required />
        <button className="btn btn-primary" type="submit" disabled={nameSaving}>
          {nameSaving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </form>

      <h2>Изменить пароль</h2>
      <form className="plain-form" onSubmit={handlePwdSave}>
        {pwdError && <div className="error-msg">{pwdError}</div>}
        <label>Текущий пароль</label>
        <input
          type="password"
          value={currentPwd}
          onChange={(e) => {
            setCurrentPwd(e.target.value)
            setPwdError('')
          }}
          required
        />
        <label>Новый пароль</label>
        <input
          type="password"
          value={newPwd}
          onChange={(e) => {
            setNewPwd(e.target.value)
            setPwdError('')
          }}
          required
          minLength={8}
        />
        <button className="btn btn-primary" type="submit" disabled={pwdSaving}>
          {pwdSaving ? 'Сохранение...' : 'Сменить пароль'}
        </button>
      </form>
    </>
  )
}
