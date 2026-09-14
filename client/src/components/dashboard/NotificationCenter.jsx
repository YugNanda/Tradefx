import { useState, useEffect } from 'react'
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react'
import { notificationsApi } from '../../api/marketApi'
import './NotificationCenter.css'

export default function NotificationCenter({ onClose, onCountUpdated }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    notificationsApi
      .get()
      .then((res) => {
        setItems(res.notifications || [])
        onCountUpdated?.(res.unreadCount || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const markAllRead = async () => {
    try {
      await notificationsApi.markRead('all')
      setItems((prev) => prev.map((item) => ({ ...item, read: true })))
      onCountUpdated?.(0)
    } catch {}
  }

  const clearAll = async () => {
    try {
      await notificationsApi.clearAll()
      setItems([])
      onCountUpdated?.(0)
    } catch {}
  }

  return (
    <div
      className="notif-drawer-backdrop"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="notif-drawer">
        <div className="notif-head">
          <h3>
            <Bell size={16} /> Notification Center
          </h3>
          <div className="notif-actions">
            {items.some((i) => !i.read) && (
              <button className="notif-text-btn" onClick={markAllRead} title="Mark all read">
                <CheckCheck size={14} />
              </button>
            )}
            {items.length > 0 && (
              <button className="notif-text-btn" onClick={clearAll} title="Clear all notifications">
                <Trash2 size={14} />
              </button>
            )}
            <button className="modal-close-icon" onClick={onClose} aria-label="Close">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="notif-list">
          {loading ? (
            <div className="notif-empty">Loading notifications…</div>
          ) : items.length === 0 ? (
            <div className="notif-empty">No notifications yet. Price alerts and orders will appear here.</div>
          ) : (
            items.map((item) => (
              <div key={item._id} className={`notif-item ${item.read ? '' : 'unread'}`}>
                <div className="notif-item-title">{item.title}</div>
                <div className="notif-item-msg">{item.message}</div>
                <div className="notif-item-time">
                  {item.createdAt ? new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
