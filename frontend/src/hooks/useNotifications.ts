import { useState, useCallback, useEffect } from 'react'

interface NotifyOptions {
  body?: string
  icon?: string
  tag?: string
  onClick?: () => void
}

export function useNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  )

  const isSupported = typeof Notification !== 'undefined'

  useEffect(() => {
    if (isSupported) {
      setPermission(Notification.permission)
    }
  }, [isSupported])

  const requestPermission = useCallback(async () => {
    if (!isSupported) return 'denied' as NotificationPermission
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [isSupported])

  const notify = useCallback(
    (title: string, options?: NotifyOptions) => {
      if (!isSupported || permission !== 'granted') return

      try {
        const notification = new Notification(title, {
          body: options?.body,
          icon: options?.icon || '/favicon.ico',
          tag: options?.tag,
          silent: true,
        })

        if (options?.onClick) {
          notification.onclick = () => {
            window.focus()
            options.onClick?.()
            notification.close()
          }
        }

        // Auto-close after 5s
        setTimeout(() => notification.close(), 5000)
      } catch {
        // Silently fail (e.g. Service Worker required in some browsers)
      }
    },
    [isSupported, permission]
  )

  return {
    permission,
    isSupported,
    requestPermission,
    notify,
  }
}
