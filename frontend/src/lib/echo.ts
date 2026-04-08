import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo: Echo<'reverb'> | null
  }
}

const WEBSOCKET_ENABLED = import.meta.env.VITE_WEBSOCKET_ENABLED !== 'false'
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

let echo: Echo<'reverb'> | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 20
const BASE_RECONNECT_DELAY = 1000

function getAuthToken(): string | null {
  try {
    const authData = localStorage.getItem('crm-auth')
    return authData ? JSON.parse(authData)?.state?.token : null
  } catch {
    return null
  }
}

function createEchoInstance(): Echo<'reverb'> {
  const wsHost = import.meta.env.VITE_REVERB_HOST || import.meta.env.VITE_PUSHER_HOST || '127.0.0.1'
  const wsPort = Number(import.meta.env.VITE_REVERB_PORT || import.meta.env.VITE_PUSHER_PORT || 6001)
  const wsScheme = import.meta.env.VITE_REVERB_SCHEME || 'http'
  const forceTLS = wsScheme === 'https'

  return new Echo({
    broadcaster: 'reverb',
    key: import.meta.env.VITE_REVERB_APP_KEY || import.meta.env.VITE_PUSHER_APP_KEY || 'app-key',
    wsHost,
    wsPort,
    wssPort: wsPort,
    forceTLS,
    disableStats: true,
    enabledTransports: forceTLS ? ['ws', 'wss'] : ['ws'],
    cluster: 'mt1',
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
        const token = getAuthToken()
        const baseUrl = API_BASE.replace(/\/api\/?$/, '')
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        }

        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        fetch(`${baseUrl}/api/broadcasting/auth`, {
          method: 'POST',
          credentials: 'include',
          headers,
          body: JSON.stringify({
            socket_id: socketId,
            channel_name: channel.name,
          }),
        })
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Auth failed: ${response.status}`)
            }
            return response.json()
          })
          .then((data) => {
            callback(null, data)
          })
          .catch((error) => {
            callback(error instanceof Error ? error : new Error(String(error)), null)
          })
      },
    }),
  })
}

function scheduleReconnect() {
  if (reconnectTimer) return
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.warn('[Echo] Max reconnect attempts reached. Waiting for user interaction.')
    // Reset on next user interaction to try again
    const resetOnInteraction = () => {
      reconnectAttempts = 0
      reconnectEcho()
      document.removeEventListener('click', resetOnInteraction)
      document.removeEventListener('keydown', resetOnInteraction)
    }
    document.addEventListener('click', resetOnInteraction, { once: true })
    document.addEventListener('keydown', resetOnInteraction, { once: true })
    return
  }

  const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 30000)
  reconnectAttempts++

  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    reconnectEcho()
  }, delay)
}

/**
 * Reconnects the Echo instance with a fresh token.
 * Called automatically on connection loss or can be called manually.
 */
export function reconnectEcho() {
  if (!WEBSOCKET_ENABLED) return

  const token = getAuthToken()
  if (!token) {
    scheduleReconnect()
    return
  }

  try {
    echo?.disconnect()
  } catch { /* ignore */ }

  try {
    echo = createEchoInstance()
    window.Echo = echo

    // Monitor connection state via the underlying Pusher connector
    const connector = (echo as any).connector?.pusher
    if (connector) {
      connector.connection.bind('connected', () => {
        reconnectAttempts = 0
      })

      connector.connection.bind('disconnected', () => {
        scheduleReconnect()
      })

      connector.connection.bind('unavailable', () => {
        scheduleReconnect()
      })

      connector.connection.bind('error', () => {
        scheduleReconnect()
      })
    }

    // Dispatch event so hooks can re-subscribe
    window.dispatchEvent(new CustomEvent('echo:reconnected'))
  } catch {
    scheduleReconnect()
  }
}

// Initialize
if (WEBSOCKET_ENABLED) {
  window.Pusher = Pusher

  echo = createEchoInstance()
  window.Echo = echo

  // Monitor connection state
  const connector = (echo as any).connector?.pusher
  if (connector) {
    connector.connection.bind('connected', () => {
      reconnectAttempts = 0
    })

    connector.connection.bind('disconnected', () => {
      scheduleReconnect()
    })

    connector.connection.bind('unavailable', () => {
      scheduleReconnect()
    })

    connector.connection.bind('error', () => {
      scheduleReconnect()
    })
  }

  // Reconnect when tab becomes visible again (user comes back)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      const pusher = (echo as any)?.connector?.pusher
      const state = pusher?.connection?.state
      if (state && state !== 'connected' && state !== 'connecting') {
        reconnectAttempts = 0
        reconnectEcho()
      }
    }
  })

  // Reconnect on network recovery
  window.addEventListener('online', () => {
    reconnectAttempts = 0
    reconnectEcho()
  })
} else {
  window.Echo = null
}

/**
 * Returns the current Echo instance (always fresh, survives reconnections).
 */
export function getEcho(): Echo<'reverb'> | null {
  return echo
}

export default echo
