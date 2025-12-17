import api from './axios'

// =====================
// TYPES
// =====================

export interface ContentCreator {
  id: string
  name: string
  video_count: number
  style_summary?: string
  created_at: string
  transcriptions?: ContentTranscription[]
}

export interface ContentTranscription {
  video_url: string
  video_title?: string
  transcription: string
  duration_seconds?: number
  platform?: string
  created_at: string
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  step?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface ChatResponse {
  message: string
  session_id: string
  current_step: string
  requires_action: boolean
  action_type?: string
  options?: any[]
  final_content?: string
  metadata?: Record<string, any>
}

export interface ContentSession {
  id: string
  topic?: string
  current_step: string
  created_at: string
  updated_at: string
  messages?: ChatMessage[]
  final_reel?: string
}

export interface ViralVideo {
  title: string
  url: string
  platform: string
  views?: number
  duration?: number
  channel?: string
  thumbnail?: string
}

export interface TranscriptionResult {
  video_url: string
  video_title?: string
  transcription: string
  duration_seconds?: number
  language?: string
  platform?: string
}

// =====================
// API ENDPOINTS
// =====================

export const contentApi = {
  // Chat
  chat: (message: string, sessionId?: string) =>
    api.post<ChatResponse>('/ai/content/chat', {
      message,
      session_id: sessionId
    }),

  // Sessões
  listSessions: (limit = 20) =>
    api.get<{ sessions: ContentSession[]; total: number }>('/ai/content/sessions', {
      params: { limit }
    }),

  getSession: (sessionId: string) =>
    api.get<ContentSession>(`/ai/content/sessions/${sessionId}`),

  // Criadores
  listCreators: () =>
    api.get<{ creators: ContentCreator[]; total: number }>('/ai/content/creators'),

  getCreator: (creatorId: string) =>
    api.get<ContentCreator>(`/ai/content/creators/${creatorId}`),

  createCreator: (name: string, videoUrls: string[] = []) =>
    api.post<{ success: boolean; creator: ContentCreator; transcribed_count: number; failed_count: number }>('/ai/content/creators', {
      name,
      video_urls: videoUrls
    }),

  addVideoToCreator: (creatorId: string, videoUrl: string) =>
    api.post<{ success: boolean; transcription: TranscriptionResult }>(`/ai/content/creators/${creatorId}/videos`, {
      video_url: videoUrl
    }),

  deleteCreator: (creatorId: string) =>
    api.delete<{ success: boolean; message: string }>(`/ai/content/creators/${creatorId}`),

  // Busca de vídeos virais
  searchViralVideos: (topic: string, platform = 'youtube', period = 'week', limit = 10) =>
    api.post<{ videos: ViralVideo[]; topic: string; platform: string; period: string; total: number }>('/ai/content/search-viral', {
      topic,
      platform,
      period,
      limit
    }),

  // Transcrição
  transcribeVideo: (videoUrl: string) =>
    api.post<TranscriptionResult>('/ai/content/transcribe', {
      video_url: videoUrl
    }),
}

export default contentApi
