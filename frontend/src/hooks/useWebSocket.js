import { useEffect, useRef, useState, useCallback } from 'react'

var WS_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/^http/, 'ws') + '/ws'

export function useWebSocket() {
  var [connected, setConnected]   = useState(false)
  var [lastEvent, setLastEvent]   = useState(null)
  var [wsEvents, setWsEvents]     = useState([])
  var wsRef      = useRef(null)
  var reconnectRef = useRef(null)

  var connect = useCallback(function() {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return
    try {
      var ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen = function() {
        setConnected(true)
        var hb = setInterval(function() {
          if (ws.readyState === WebSocket.OPEN) ws.send('ping')
        }, 25000)
        ws._hb = hb
      }
      ws.onmessage = function(e) {
        try {
          var data = JSON.parse(e.data)
          if (data.type === 'pong') return
          setLastEvent(data)
          setWsEvents(function(prev) { return prev.concat([{...data, ts: Date.now()}]).slice(-100) })
        } catch(_) {}
      }
      ws.onclose = function() {
        setConnected(false)
        if (ws._hb) clearInterval(ws._hb)
        reconnectRef.current = setTimeout(connect, 3000)
      }
      ws.onerror = function() { ws.close() }
    } catch(_) {
      reconnectRef.current = setTimeout(connect, 3000)
    }
  }, [])

  useEffect(function() {
    connect()
    return function() {
      if (reconnectRef.current) clearTimeout(reconnectRef.current)
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close() }
    }
  }, [connect])

  return { connected, lastEvent, wsEvents }
}
