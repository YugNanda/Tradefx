import { useState, useEffect } from 'react'
import { Bell, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { alertsApi } from '../../api/marketApi'
import './AlertsPanel.css'

export default function AlertsPanel({ presetSymbol }) {
  const [alerts, setAlerts] = useState([])
  const [form, setForm] = useState({ symbol: '', condition: 'above', targetPrice: '' })

  const load = () => alertsApi.get().then(setAlerts).catch(() => {})

  useEffect(() => {
    load()
  }, [])

  useEffect(() => {
    if (presetSymbol) setForm((f) => ({ ...f, symbol: presetSymbol }))
  }, [presetSymbol])

  const submit = async (e) => {
    e.preventDefault()
    if (!form.symbol || !form.targetPrice) return
    try {
      await alertsApi.create(form.symbol.toUpperCase(), form.condition, Number(form.targetPrice))
      toast.success('Alert created')
      setForm((f) => ({ ...f, targetPrice: '' }))
      load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not create alert')
    }
  }

  const remove = async (id) => {
    try {
      await alertsApi.remove(id)
      setAlerts((a) => a.filter((al) => al._id !== id))
    } catch (err) {
      toast.error('Could not delete alert')
    }
  }

  return (
    <div className="side-panel">
      <div className="side-panel-head">
        <Bell size={15} />
        <h3>Price alerts</h3>
      </div>

      <form className="al-form" onSubmit={submit}>
        <input
          className="al-input"
          placeholder="Symbol e.g. AAPL"
          value={form.symbol}
          onChange={(e) => setForm((f) => ({ ...f, symbol: e.target.value.toUpperCase() }))}
        />
        <select
          className="al-select"
          value={form.condition}
          onChange={(e) => setForm((f) => ({ ...f, condition: e.target.value }))}
        >
          <option value="above">Above</option>
          <option value="below">Below</option>
        </select>
        <input
          className="al-input al-price"
          type="number"
          step="any"
          placeholder="Target price"
          value={form.targetPrice}
          onChange={(e) => setForm((f) => ({ ...f, targetPrice: e.target.value }))}
        />
        <button className="al-add" type="submit">Add</button>
      </form>

      {alerts.length === 0 ? (
        <p className="side-panel-empty">No alerts yet — get notified when a price crosses your target.</p>
      ) : (
        <div className="side-panel-list">
          {alerts.map((a) => (
            <div key={a._id} className={`al-row ${a.active ? '' : 'al-row-done'}`}>
              <span className="al-row-text">
                <strong>{a.symbol}</strong> {a.condition} {a.targetPrice}
              </span>
              {!a.active && <span className="al-triggered-tag">triggered</span>}
              <span className="al-remove" onClick={() => remove(a._id)}>
                <X size={13} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
