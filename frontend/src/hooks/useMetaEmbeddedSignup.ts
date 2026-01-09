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
    }
    fbAsyncInit: () => void
  }
}

interface FBLoginResponse {
  status: string
  authResponse?: {
    code: string
    accessToken?: string
    userID?: string
    expiresIn?: number
  }
}

interface FBLoginOptions {
  config_id: string
  response_type: string
  override_default_response_type: boolean
  extras?: {
    setup?: {
      solutionID?: string
    }
    featureType?: string
    sessionInfoVersion?: string
    version?: string
  }
}

interface SessionInfoData {
  waba_id?: string
  phone_number_id?: string
}

interface EmbeddedSignupConfig {
  appId: string
  configId: string
  version?: string
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

// Hook para carregar o Facebook SDK
export function useFacebookSDK(appId: string, version = 'v19.0') {
  const [isLoaded, setIsLoaded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const loadAttempted = useRef(false)

  useEffect(() => {
    // Evita carregar múltiplas vezes
    if (loadAttempted.current) return
    loadAttempted.current = true

    // Se já existe FB no window, apenas inicializa
    if (window.FB) {
      window.FB.init({
        appId,
        xfbml: true,
        version,
      })
      setIsLoaded(true)
      return
    }

    // Define callback para quando o SDK carregar
    window.fbAsyncInit = function () {
      window.FB.init({
        appId,
        xfbml: true,
        version,
      })
      setIsLoaded(true)
    }

    // Carrega o script do SDK
    const script = document.createElement('script')
    script.id = 'facebook-jssdk'
    script.src = 'https://connect.facebook.net/en_US/sdk.js'
    script.async = true
    script.defer = true

    script.onerror = () => {
      setError('Failed to load Facebook SDK')
    }

    // Verifica se o script já existe
    const existingScript = document.getElementById('facebook-jssdk')
    if (!existingScript) {
      document.body.appendChild(script)
    }

    return () => {
      // Cleanup: remove o script se necessário
      // Nota: geralmente não removemos o SDK uma vez carregado
    }
  }, [appId, version])

  return { isLoaded, error }
}

// Hook principal para Embedded Signup
export function useMetaEmbeddedSignup() {
  const queryClient = useQueryClient()
  const [sessionInfo, setSessionInfo] = useState<SessionInfoData | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // Mutation para enviar dados para o backend
  const processSignupMutation = useMutation({
    mutationFn: async (data: {
      code: string
      waba_id?: string
      phone_number_id?: string
    }) => {
      const response = await api.post<EmbeddedSignupResponse>(
        '/api/meta/embedded-signup',
        data
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['meta-integrations'] })
      queryClient.invalidateQueries({ queryKey: ['meta-status'] })
      toast.success(data.message || 'WhatsApp conectado com sucesso!')
      setSessionInfo(null)
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
      // Verifica se a mensagem é do Facebook
      if (
        event.origin !== 'https://www.facebook.com' &&
        event.origin !== 'https://web.facebook.com'
      ) {
        return
      }

      // Processa mensagens do Embedded Signup
      if (event.data?.type === 'WA_EMBEDDED_SIGNUP') {
        const data = event.data.data as SessionInfoData
        setSessionInfo(data)

        // Se temos os dados, podemos usá-los junto com o code
        console.log('Embedded Signup sessionInfo received:', data)
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [])

  // Função para iniciar o fluxo de Embedded Signup
  const startEmbeddedSignup = useCallback(
    (config: EmbeddedSignupConfig) => {
      if (!window.FB) {
        toast.error('Facebook SDK não carregado')
        return
      }

      if (!config.configId) {
        toast.error('Configuration ID não configurado')
        return
      }

      setIsProcessing(true)

      window.FB.login(
        (response: FBLoginResponse) => {
          if (response.authResponse?.code) {
            // Sucesso - envia para o backend
            processSignupMutation.mutate({
              code: response.authResponse.code,
              waba_id: sessionInfo?.waba_id,
              phone_number_id: sessionInfo?.phone_number_id,
            })
          } else {
            // Usuário cancelou ou erro
            setIsProcessing(false)
            if (response.status === 'unknown') {
              // Usuário fechou o popup sem completar
              console.log('User closed the login popup')
            } else {
              toast.error('Falha na autenticacao com o Facebook')
            }
          }
        },
        {
          config_id: config.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras: {
            sessionInfoVersion: '3',
            version: '2', // Versão 2 do UI do Embedded Signup
          },
        }
      )
    },
    [processSignupMutation, sessionInfo]
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

  const handleConnect = useCallback(() => {
    if (!isSDKLoaded) {
      toast.error('Aguarde o carregamento do Facebook SDK')
      return
    }

    startEmbeddedSignup({
      appId,
      configId,
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
