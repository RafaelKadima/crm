import { useEffect } from 'react'
import { useGtmSettings } from '@/hooks/useGtm'

/**
 * Componente que injeta o script do Google Tag Manager na página.
 * Deve ser colocado no componente raiz da aplicação.
 */
export function GtmScript() {
  const { data: settings } = useGtmSettings()

  useEffect(() => {
    if (!settings?.gtm_enabled || !settings?.gtm_container_id) {
      return
    }

    const containerId = settings.gtm_container_id

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

    // Log para debug
    console.log(`[GTM] Container ${containerId} inicializado`)

    return () => {
      // Cleanup ao desmontar (opcional)
    }
  }, [settings?.gtm_enabled, settings?.gtm_container_id])

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
    console.log(`[GTM] Event pushed: ${eventName}`, eventData)
  }
}

