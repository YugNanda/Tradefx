import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import toast from 'react-hot-toast'
import { useAuth } from './AuthContext'
import { marketApi } from '../api/marketApi'

const MarketContext = createContext(null)

export function MarketProvider({ children }) {
  const { user } = useAuth()
  const socketRef = useRef(null)
  const refCounts = useRef(new Map()) // symbol -> number of components subscribed
  const [quotes, setQuotes] = useState({}) // symbol -> { price, changePercent, asOf, approximate, stale }
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    // In production VITE_API_URL is the Render backend URL (e.g. https://tradex-server.onrender.com).
    // In development it's empty, so socket.io connects to the same origin (proxied by Vite).
    const BACKEND = import.meta.env.VITE_API_URL || ''
    const socket = io(BACKEND, { path: '/socket.io', transports: ['websocket', 'polling'] })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('tick', (tick) => {
      setQuotes((prev) => ({ ...prev, [tick.symbol]: tick }))
    })

    socket.on('alert:triggered', (alert) => {
      toast(
        `${alert.symbol} is now ${alert.condition} ${alert.targetPrice} (currently ${alert.price})`,
        { icon: '🔔', duration: 6000 }
      )
    })

    return () => socket.disconnect()
  }, [])

  useEffect(() => {
    if (user?._id && socketRef.current) {
      socketRef.current.emit('join:user', user._id)
    }
  }, [user?._id, connected])

  // Reference-counted subscribe so multiple components watching the same
  // symbol don't fight over join/leave.
  const subscribe = useCallback((symbols) => {
    const list = Array.isArray(symbols) ? symbols : [symbols]
    const toJoin = []
    list.forEach((sym) => {
      const count = refCounts.current.get(sym) || 0
      if (count === 0) toJoin.push(sym)
      refCounts.current.set(sym, count + 1)
    })
    if (toJoin.length && socketRef.current) {
      socketRef.current.emit('join:market', toJoin)
      // Don't make a brand-new symbol sit blank until the next scheduler
      // tick (up to PRICE_POLL_INTERVAL_MS away) — fetch it once directly.
      toJoin.forEach((sym) => {
        marketApi
          .getQuote(sym)
          .then((quote) => setQuotes((prev) => ({ ...prev, [sym]: { ...quote, symbol: sym } })))
          .catch(() => {})
      })
    }
  }, [])

  const unsubscribe = useCallback((symbols) => {
    const list = Array.isArray(symbols) ? symbols : [symbols]
    const toLeave = []
    list.forEach((sym) => {
      const count = refCounts.current.get(sym) || 0
      if (count <= 1) {
        refCounts.current.delete(sym)
        toLeave.push(sym)
      } else {
        refCounts.current.set(sym, count - 1)
      }
    })
    if (toLeave.length && socketRef.current) socketRef.current.emit('leave:market', toLeave)
  }, [])

  return (
    <MarketContext.Provider value={{ quotes, subscribe, unsubscribe, connected }}>
      {children}
    </MarketContext.Provider>
  )
}

export const useMarket = () => useContext(MarketContext)

/** Subscribe to one or more symbols for the lifetime of the calling component. */
export function useLiveQuotes(symbols) {
  const { quotes, subscribe, unsubscribe } = useMarket()
  const key = Array.isArray(symbols) ? symbols.join(',') : symbols

  useEffect(() => {
    if (!key) return
    const list = key.split(',').filter(Boolean)
    if (list.length === 0) return
    subscribe(list)
    return () => unsubscribe(list)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  if (!key) return {}
  const list = key.split(',').filter(Boolean)
  return Object.fromEntries(list.map((s) => [s, quotes[s]]))
}
