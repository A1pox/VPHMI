import { useNavigate } from 'react-router-dom'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="form-page">
      <div className="form-box center-text">
        <h1>404</h1>
        <p>Страница не найдена</p>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          На главную
        </button>
      </div>
    </div>
  )
}
