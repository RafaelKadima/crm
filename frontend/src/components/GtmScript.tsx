import { useEffect } from 'react'
import { useGtmSettings } from '@/hooks/useGtm'
import { useAuthStore } from '@/store/authStore'
import { getEcho } from '@/lib/echo'

/**
 * Componente que injeta o script do Google Tag Manager na página.
 * Deve ser colocado no componente raiz da aplicação.
 */
export function GtmScript() {
  const { data: settings } = useGtmSettings()
  const { user } = useAuthStore()
  const tenantId = user?.tenant_id

  // Injeta o script do GTM
  useEffect(() => {
    if (!settings?.gtm_enabled || !settings?.gtm_container_id) {
      return
    }

    const containerId = settings.gtm_container_id

    // Valida formato do container ID para prevenir XSS
    if (!/^GTM-[A-Z0-9]{1,10}$/.test(containerId)) {
      console.warn('Invalid GTM container ID format:', containerId)
      return
    }

    // Verifica se já foi injetado
    if (document.querySelector(`script[data-gtm="${containerId}"]`)) {
      return
    }

    // Inicializa dataLayer
    ;(window as any).dataLayer = (window as any).dataLayer || []

    // Injeta o script do GTM
    const script = document.createElement('script')
    script.setAttribute('data-gtm', containerId)
    script.innerHTML = `
      (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
      new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
      j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
      'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
      })(window,document,'script','dataLayer','${containerId}');
    `
    document.head.appendChild(script)

    // Injeta o noscript (para quando JS está desabilitado)
    const noscript = document.createElement('noscript')
    noscript.setAttribute('data-gtm-noscript', containerId)
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.googletagmanager.com/ns.html?id=${containerId}`
    iframe.height = '0'
    iframe.width = '0'
    iframe.style.display = 'none'
    iframe.style.visibility = 'hidden'
    noscript.appendChild(iframe)
    document.body.insertBefore(noscript, document.body.firstChild)

    return () => {
      // Cleanup ao desmontar (opcional)
    }
  }, [settings?.gtm_enabled, settings?.gtm_container_id])

  // Escuta eventos GTM via WebSocket
  useEffect(() => {
    // Só conecta se WebSocket estiver habilitado (echo não é null)
    const echoInstance = getEcho()
    if (!echoInstance || !settings?.gtm_enabled || !tenantId) {
      return
    }

    const channel = echoInstance.private(`tenant.${tenantId}.gtm`)

    channel
      .subscribed(() => {
      })
      .listen('.gtm.event', (eventData: Record<string, any>) => {
        // Faz push no dataLayer
        if (typeof window !== 'undefined' && (window as any).dataLayer) {
          (window as any).dataLayer.push(eventData)
        }
      })

    return () => {
      getEcho()?.leave(`tenant.${tenantId}.gtm`)
    }
  }, [settings?.gtm_enabled, tenantId])

  return null
}

/**
 * Hook utilitário para disparar eventos GTM.
 */
export function pushGtmEvent(eventName: string, eventData?: Record<string, any>) {
  if (typeof window !== 'undefined' && (window as any).dataLayer) {
    (window as any).dataLayer.push({
      event: eventName,
      ...eventData,
      timestamp: new Date().toISOString(),
    })
  }
}

