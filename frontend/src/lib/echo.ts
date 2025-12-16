import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

// Declarar Pusher no window para o Echo usar
declare global {
  interface Window {
    Pusher: typeof Pusher
    Echo: Echo<'pusher'> | null
  }
}

// Verificar se WebSocket está habilitado
const WEBSOCKET_ENABLED = import.meta.env.VITE_WEBSOCKET_ENABLED !== 'false'

// URL base da API
const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

let echo: Echo<'pusher'> | null = null

if (WEBSOCKET_ENABLED) {
  window.Pusher = Pusher

  // Configuração do Laravel Echo
  echo = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY || 'app-key',
    wsHost: import.meta.env.VITE_PUSHER_HOST || '127.0.0.1',
    wsPort: import.meta.env.VITE_PUSHER_PORT || 6001,
    wssPort: import.meta.env.VITE_PUSHER_PORT || 6001,
    forceTLS: false,
    disableStats: true,
    enabledTransports: ['ws', 'wss'],
    cluster: 'mt1',
    // Autorização para canais privados
    authorizer: (channel: { name: string }) => ({
      authorize: (socketId: string, callback: (error: Error | null, data: { auth: string } | null) => void) => {
        // Pegar token do localStorage (onde o authStore salva)
        const authData = localStorage.getItem('crm-auth')
        const token = authData ? JSON.parse(authData)?.state?.token : null

        if (!token) {
          console.warn('⚠️ No auth token found for WebSocket authorization')
          callback(new Error('No token'), null)
          return
        }

        // Remove /api do final se existir para evitar duplicação
        const baseUrl = API_BASE.replace(/\/api\/?$/, '')
        fetch(`${baseUrl}/api/broadcasting/auth`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
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
            console.log('✅ WebSocket channel authorized:', channel.name)
            callback(null, data)
          })
          .catch((error) => {
            console.error('❌ WebSocket auth error:', error)
            callback(error instanceof Error ? error : new Error(String(error)), null)
          })
      },
    }),
  })

  // Exportar para uso global
  window.Echo = echo
} else {
  console.info('ℹ️ WebSocket disabled (VITE_WEBSOCKET_ENABLED=false)')
  window.Echo = null
}

export default echo

