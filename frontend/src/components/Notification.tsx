import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '@store/index'
import { dismissNotification } from '@store/uiSlice'

export default function Notification() {
  const dispatch = useAppDispatch()
  const notification = useAppSelector((s) => s.ui.notification)

  useEffect(() => {
    if (!notification) return
    const timer = setTimeout(() => dispatch(dismissNotification()), 3000)
    return () => clearTimeout(timer)
  }, [dispatch, notification])

  if (!notification) return null

  return (
    <div className={`notification notification-${notification.type}`}>
      <span>{notification.message}</span>
      <button className="notification-close" onClick={() => dispatch(dismissNotification())}>
        x
      </button>
    </div>
  )
}
