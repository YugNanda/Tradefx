import { useState, useEffect, useRef } from 'react'
import { Search } from 'lucide-react'
import { marketApi } from '../../api/marketApi'
import './SymbolSearch.css'

export default function SymbolSearch({ onSelect }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [open, setOpen] = useState(false)
  const boxRef = useRef(null)

  useEffect(() => {
    const fn = (e) => {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false)
    }
    window.addEventListener('mousedown', fn)
    return () => window.removeEventListener('mousedown', fn)
  }, [])

  useEffect(() => {
    let cancelled = false
    marketApi.search(query).then((r) => {
      if (!cancelled) setResults(r)
    })
    return () => {
      cancelled = true
    }
  }, [query])

  const pick = (instrument) => {
    onSelect(instrument)
    setQuery('')
    setOpen(false)
  }

  return (
    <div className="sym-search" ref={boxRef}>
      <Search size={15} className="sym-search-icon" />
      <input
        placeholder="Search stocks, crypto, forex…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => setOpen(true)}
      />
      {open && results.length > 0 && (
        <div className="sym-search-dropdown">
          {results.map((r) => (
            <button key={r.symbol} className="sym-search-row" onClick={() => pick(r)}>
              <span className="ssr-symbol">{r.symbol}</span>
              <span className="ssr-name">{r.name}</span>
              <span className="ssr-tag">{r.assetClass}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
