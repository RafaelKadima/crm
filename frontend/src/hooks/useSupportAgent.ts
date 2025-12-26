import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supportAgentApi, SupportSession, ChatResponse, SupportAction } from '@/api/supportAgent'
import { toast } from 'sonner'

// Query Keys
export const supportAgentKeys = {
  all: ['support-agent'] as const,
  sessions: () => [...supportAgentKeys.all, 'sessions'] as const,
  session: (id: string) => [...supportAgentKeys.all, 'session', id] as const,
}

// Hooks
export function useSupportSessions() {
  return useQuery({
    queryKey: supportAgentKeys.sessions(),
    queryFn: supportAgentApi.getSessions,
  })
}

export function useSupportSession(sessionId: string | null) {
  return useQuery({
    queryKey: supportAgentKeys.session(sessionId || ''),
    queryFn: () => supportAgentApi.getSession(sessionId!),
    enabled: !!sessionId,
  })
}

export function useCreateSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (title?: string) => supportAgentApi.createSession(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportAgentKeys.sessions() })
    },
    onError: (error: Error) => {
      toast.error('Erro ao criar sessao: ' + error.message)
    },
  })
}

export function useCompleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, summary }: { sessionId: string; summary?: string }) =>
      supportAgentApi.completeSession(sessionId, summary),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supportAgentKeys.sessions() })
      queryClient.invalidateQueries({ queryKey: supportAgentKeys.session(variables.sessionId) })
      toast.success('Sessao encerrada')
    },
    onError: (error: Error) => {
      toast.error('Erro ao encerrar sessao: ' + error.message)
    },
  })
}

export function useSendMessage() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ sessionId, message }: { sessionId: string; message: string }) =>
      supportAgentApi.sendMessage(sessionId, message),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: supportAgentKeys.session(variables.sessionId) })
    },
    onError: (error: Error) => {
      toast.error('Erro ao enviar mensagem: ' + error.message)
    },
  })
}

export function useApproveAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actionId: string) => supportAgentApi.approveAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportAgentKeys.all })
      toast.success('Acao aprovada e executada')
    },
    onError: (error: Error) => {
      toast.error('Erro ao aprovar acao: ' + error.message)
    },
  })
}

export function useRejectAction() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (actionId: string) => supportAgentApi.rejectAction(actionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supportAgentKeys.all })
      toast.info('Acao rejeitada')
    },
    onError: (error: Error) => {
      toast.error('Erro ao rejeitar acao: ' + error.message)
    },
  })
}
