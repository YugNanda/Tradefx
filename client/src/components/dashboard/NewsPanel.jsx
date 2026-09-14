import { useState, useEffect } from 'react'
import { Newspaper, ExternalLink, Loader2, RefreshCw } from 'lucide-react'
import { newsApi } from '../../api/marketApi'
import './NewsPanel.css'

// News is cached in MongoDB with a 6-hour TTL and fetched from Newsdata.io.
export default function NewsPanel({ symbol }) {
  const [news, setNews] = useState(null) // null = not loaded yet
  const [loading, setLoading] = useState(false)
  const [loadedFor, setLoadedFor] = useState(null)

  // Reset (but don't auto-fetch) when the selected symbol changes.
  useEffect(() => {
    setNews(null)
    setLoadedFor(null)
  }, [symbol])

  const load = () => {
    setLoading(true)
    newsApi
      .get(symbol)
      .then((items) => {
        setNews(items)
        setLoadedFor(symbol || 'GENERAL')
      })
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }

  return (
    <div className="side-panel news-panel">
      <div className="side-panel-head news-panel-head">
        <Newspaper size={15} />
        <h3>{symbol ? `${symbol} Financial News` : 'Global Market Headlines'}</h3>
        <button className="news-refresh-btn" onClick={load} disabled={loading} title="Refresh live headlines">
          {loading ? <Loader2 size={13} className="spin" /> : <RefreshCw size={13} />}
        </button>
      </div>

      {news === null && !loading && (
        <button className="news-load-btn" onClick={load}>
          Load {symbol ? `${symbol} ` : 'market '}headlines
        </button>
      )}

      {loading && (
        <div className="news-loading">
          <Loader2 size={16} className="spin" /> Fetching latest headlines…
        </div>
      )}

      {news !== null && !loading && news.length === 0 && (
        <p className="side-panel-empty">No recent news found right now — try again shortly.</p>
      )}

      {news && news.length > 0 && (
        <div className="news-list">
          {news.map((item, i) => (
            <a
              key={item._id || i}
              className="news-item"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="news-headline">
                {item.headline} <ExternalLink size={11} className="news-ext-icon" />
              </div>
              <p className="news-summary">{item.summary}</p>
              <div className="news-meta">{item.sourceName}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
