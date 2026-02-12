import { useState, useEffect, useCallback, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import api from '@/api/axios'
import { toast } from 'sonner'

// Tipos para o Facebook SDK
declare global {
  interface Window {
    FB: {
      init: (params: {
        appId: string
        xfbml: boolean
        version: string
      }) => void
      login: (
        callback: (response: FBLoginResponse) => void,
        options: FBLoginOptions
      ) => void
      getLoginStatus: (callback: (response: FBLoginResponse) => void) => void
    }
    fbAsyncInit: () => void
  }
}

interface FBLoginResponse {
  status: string
  authResponse?: {
    code?: string
    accessToken?: string
    userID?: string
    expiresIn?: number
    signedRequest?: string
  }
}

interface FBLoginOptions {
  config_id: string
  response_type: string
  override_default_response_type: boolean
  extras?: {
    version?: string
    featureType?: string
    setup?: {
      business?: {
        id?: string | null
        name?: string | null
        email?: string | null
        phone?: { code?: string | null; number?: string | null }
        website?: string | null
        address?: {
          streetAddress1?: string | null
          streetAddress2?: string | null
          city?: string | null
          state?: string | null
          zipPostal?: string | null
          country?: string | null
        }
        timezone?: string | null
      }
      phone?: {
        displayName?: string | null
        category?: string | null
        description?: string | null
      }
      preVerifiedPhone?: { ids?: string[] | null }
      solutionID?: string | null
      whatsAppBusinessAccount?: { ids?: string[] | null }
    }
  }
}

interface SessionInfoData {
  waba_id?: string
  phone_number_id?: string
  is_coexistence?: boolean
  is_wa_login_user?: boolean
}

interface EmbeddedSignupConfig {
  appId: string
  configId: string
  version?: string
  featureType?: 'whatsapp_business_app_onboarding' | ''
}

interface EmbeddedSignupResponse {
  success: boolean
  message: string
  data?: {
    id: string
    phone_number_id: string
    display_phone_number: string
    verified_name: string
    status: string
    expires_at: string
  }
}

// Flag global para evitar múltiplas inicializações
let fbSDKInitialized = false
let fbSDKLoading = false
let fbInitCallbacks: ((success: boolean) => void)[] = []
let fbCurrentAppId: string | null = null

// Função para carregar o SDK do Facebook
function loadFacebookSDK(appId: string, version: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Se já inicializado COM O MESMO appId, resolve imediatamente
    if (fbSDKInitialized && window.FB && fbCurrentAppId === appId) {
      console.log('[EmbeddedSignup] SDK already initialized with appId:', appId)
      resolve(true)
      return
    }

    // Se appId mudou, resetar estado e forçar reinicialização
    if (fbSDKInitialized && fbCurrentAppId && fbCurrentAppId !== appId) {
      console.log('[EmbeddedSignup] App ID changed from', fbCurrentAppId, 'to', appId, '- reinitializing SDK')
      fbSDKInitialized = false
      fbSDKLoading = false
      fbCurrentAppId = null
      const oldScript = document.getElementById('facebook-jssdk')
      if (oldScript) {
        oldScript.remove()
      }
      delete (window as any).FB
    }

    // Se está carregando, adiciona callback
    if (fbSDKLoading) {
      fbInitCallbacks.push(resolve)
      return
    }

    // Se FB já existe mas não foi inicializado
    if (window.FB) {
      try {
        console.log('[EmbeddedSignup] FB.init with appId:', appId)
        window.FB.init({
          appId,
          xfbml: true,
          version,
        })
        fbSDKInitialized = true
        fbCurrentAppId = appId
        resolve(true)
      } catch (e) {
        console.error('Error initializing FB SDK:', e)
        resolve(false)
      }
      return
    }

    // Começa o carregamento
    fbSDKLoading = true
    fbInitCallbacks.push(resolve)

    // Define callback para quando o SDK carregar
    window.fbAsyncInit = function () {
      try {
        console.log('[EmbeddedSignup] FB.init with appId:', appId)
        window.FB.init({
          appId,
          xfbml: true,
          version,
        })
        fbSDKInitialized = true
        fbCurrentAppId = appId
        // Notifica todos os callbacks
        fbInitCallbacks.forEach((cb) => cb(true))
        fbInitCallbacks = []
      } catch (e) {
        console.error('Error in fbAsyncInit:', e)
        fbInitCallbacks.forEach((cb) => cb(false))
        fbInitCallbacks = []
      }
      fbSDKLoading = false
    }

    // Verifica se o script já existe
    const existingScript = document.getElementById('facebook-jssdk')
    if (existingScript) {
      // Script existe mas appId pode ter mudado - remover e recarregar
      existingScript.remove()
    }

    // Carrega o script do SDK
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true

    script.onerror = () => {
      console.error('Failed to load Facebook SDK script')
      fbSDKLoading = false
      fbInitCallbacks.forEach((cb) => cb(false))
      fbInitCallbacks = []
    }

    document.body.appendChild(script)
  })
}

// Hook para carregar o Facebook SDK
export function useFacebookSDK(appId: string, version = 'v24.0') {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const initAttempted = useRef(false)

  useEffect(() => {
    // Não tenta carregar se não tem appId
    if (!appId) {
      return
    }

    // Evita múltiplas tentativas
    if (initAttempted.current && isLoaded) {
      return
    }

    initAttempted.current = true

    loadFacebookSDK(appId, version)
      .then((success) => {
        if (success) {
          setIsLoaded(true)
          setError(null)
        } else {
          setError('Failed to load Facebook SDK')
        }
      })
      .catch((e) => {
        setError('Failed to load Facebook SDK')
        console.error(e)
      })
  }, [appId, version, isLoaded])

  return { isLoaded, error }
}

// Hook principal para Embedded Signup
export function useMetaEmbeddedSignup() {
  const queryClient = useQueryClient()
  const [sessionInfo, setSessionInfo] = useState<SessionInfoData | null>(null)
  const sessionInfoRef = useRef<SessionInfoData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Mutation para enviar dados para o backend
  const processSignupMutation = useMutation({
    mutationFn: async (data: {
      code?: string
      access_token?: string
      waba_id?: string
      phone_number_id?: string
      is_coexistence?: boolean
      page_url?: string
    }) => {
      const response = await api.post<EmbeddedSignupResponse>(
        '/meta/embedded-signup',
        data
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meta-integrations'] })
      queryClient.invalidateQueries({ queryKey: ['meta-status'] })
      toast.success(data.message || 'WhatsApp conectado com sucesso!')
      setSessionInfo(null)
      sessionInfoRef.current = null
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Erro ao processar Embedded Signup'
      )
    },
    onSettled: () => {
      setIsProcessing(false)
    },
  })

  // Escuta mensagens do popup do Facebook
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Aceitar mensagens de qualquer subdomínio do Facebook
      if (event.origin !== 'https://www.facebook.com' && event.origin !== 'https://web.facebook.com') {
        return
      }

      try {
        // Parse data - pode vir como string JSON ou objeto
        const parsedData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data

        // Log for debugging
        if (parsedData && parsedData.type) {
          console.log('[EmbeddedSignup] postMessage received:', {
            origin: event.origin,
            type: parsedData.type,
            event: parsedData.event,
            hasData: !!parsedData.data,
            keys: Object.keys(parsedData),
          })
        }

        // Processa mensagens do Embedded Signup
        if (parsedData.type === 'WA_EMBEDDED_SIGNUP') {
          const eventName = parsedData.event as string
          const data = parsedData.data as SessionInfoData

          if (eventName === 'FINISH' || eventName === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING') {
            // Detectar se é coexistence (número do WhatsApp Business App)
            const isCoexistence =
              eventName === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' ||
              data?.is_wa_login_user === true

            const enrichedData = { ...data, is_coexistence: isCoexistence }
            setSessionInfo(enrichedData)
            sessionInfoRef.current = enrichedData
            console.log('[EmbeddedSignup] sessionInfo received:', JSON.stringify(enrichedData), 'event:', eventName, 'coexistence:', isCoexistence)
          } else if (eventName === 'CANCEL') {
            console.warn('[EmbeddedSignup] User cancelled at step:', parsedData.data?.current_step)
          } else if (eventName === 'ERROR') {
            console.error('[EmbeddedSignup] Error from Meta:', parsedData.data?.error_message)
          }
        }
      } catch {
        // Non-JSON responses - ignore
        console.log('[EmbeddedSignup] Non-JSON response:', event.data)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Funcao para iniciar o fluxo de Embedded Signup
  const startEmbeddedSignup = useCallback(
    (config: EmbeddedSignupConfig) => {
      // Verifica se FB está disponível e inicializado
      if (!window.FB) {
        toast.error('Facebook SDK nao carregado. Atualize a pagina.')
        return
      }

      if (!fbSDKInitialized) {
        toast.error('Facebook SDK nao inicializado. Aguarde...')
        return
      }

      if (!config.configId) {
        toast.error('Configuration ID nao configurado')
        return
      }

      setIsProcessing(true)
      // Limpa sessionInfo anterior
      sessionInfoRef.current = null

      try {
        const loginOptions = {
          config_id: config.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            version: 'v3',
            featureType: config.featureType || '',
            setup: {
              business: {
                id: null,
                name: null,
                email: null,
                phone: { code: null, number: null },
                website: null,
                address: {
                  streetAddress1: null,
                  streetAddress2: null,
                  city: null,
                  state: null,
                  zipPostal: null,
                  country: null,
                },
                timezone: null,
              },
              phone: { displayName: null, category: null, description: null },
              preVerifiedPhone: { ids: null },
              solutionID: null,
              whatsAppBusinessAccount: { ids: null },
            },
          },
        }

        console.log('[EmbeddedSignup] Calling FB.login with appId:', config.appId, 'configId:', config.configId, 'options:', JSON.stringify(loginOptions))

        window.FB.login(
          (response: FBLoginResponse) => {
            // Usa ref para pegar o valor mais recente do sessionInfo
            const currentSessionInfo = sessionInfoRef.current
            console.log('[EmbeddedSignup] FB.login response:', JSON.stringify(response))
            console.log('[EmbeddedSignup] sessionInfo at callback:', JSON.stringify(currentSessionInfo))

            if (response.authResponse) {
              if (response.authResponse.accessToken) {
                console.log('[EmbeddedSignup] Got accessToken, sending to backend with sessionInfo...')
                processSignupMutation.mutate({
                  access_token: response.authResponse.accessToken,
                  waba_id: currentSessionInfo?.waba_id,
                  phone_number_id: currentSessionInfo?.phone_number_id,
                  is_coexistence: currentSessionInfo?.is_coexistence || false,
                })
              } else if (response.authResponse.code) {
                console.log('[EmbeddedSignup] Got code, sending to backend...')
                processSignupMutation.mutate({
                  code: response.authResponse.code,
                  waba_id: currentSessionInfo?.waba_id,
                  phone_number_id: currentSessionInfo?.phone_number_id,
                  is_coexistence: currentSessionInfo?.is_coexistence || false,
                  page_url: window.location.href,
                })
              } else {
                setIsProcessing(false)
                console.error('[EmbeddedSignup] No accessToken or code in response')
                toast.error('Resposta incompleta do Facebook. Tente novamente.')
              }
            } else {
              // Usuário cancelou ou erro
              setIsProcessing(false)
              if (response.status === 'unknown') {
                console.log('[EmbeddedSignup] User closed the login popup')
              } else {
                console.error('[EmbeddedSignup] Login failed with status:', response.status)
                toast.error('Falha na autenticacao com o Facebook. Verifique o console para mais detalhes.')
              }
            }
          },
          loginOptions
        )
      } catch (e) {
        console.error('Error calling FB.login:', e)
        setIsProcessing(false)
        toast.error('Erro ao abrir popup do Facebook')
      }
    },
    [processSignupMutation]
  )

  return {
    startEmbeddedSignup,
    isProcessing: isProcessing || processSignupMutation.isPending,
    sessionInfo,
    error: processSignupMutation.error,
  }
}

// Hook combinado que carrega SDK e fornece funcionalidade
export function useMetaEmbeddedSignupWithSDK(appId: string, configId: string) {
  const { isLoaded: isSDKLoaded, error: sdkError } = useFacebookSDK(appId)
  const {
    startEmbeddedSignup,
    isProcessing,
    sessionInfo,
    error: signupError,
  } = useMetaEmbeddedSignup()

  const handleConnect = useCallback((featureType?: 'whatsapp_business_app_onboarding' | '') => {
    if (!isSDKLoaded) {
      toast.error('Aguarde o carregamento do Facebook SDK')
      return
    }

    startEmbeddedSignup({
      appId,
      configId,
      featureType: featureType || '',
    })
  }, [isSDKLoaded, startEmbeddedSignup, appId, configId])

  return {
    isSDKLoaded,
    isProcessing,
    handleConnect,
    sessionInfo,
    error: sdkError || signupError,
  }
}
