import { useState, useCallback } from 'react';
import api from '../api/axios';

export interface FeedbackData {
  message_id: string;
  rating: 'positive' | 'negative' | 'neutral';
  corrected_response?: string;
  feedback_reason?: string;
  tags?: string[];
}

export interface DetectedQuestion {
  id: string;
  question: string;
  occurrence_count: number;
  suggested_answer: string | null;
  answer_confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  first_seen_at: string;
  last_seen_at: string;
  variations: string[];
}

export interface LeadMemory {
  preferences: Record<string, any>;
  interests: string[];
  pain_points: string[];
  objections_history: Array<{
    objection: string;
    response: string | null;
    date: string;
  }>;
  communication_style: string;
  decision_pattern: string;
  conversion_probability: number;
  recommended_approach: string;
  total_interactions: number;
  positive_rate: number;
}

export interface LearningStats {
  feedback: {
    total: number;
    positive: number;
    negative: number;
    processed: number;
    positive_rate: number;
  };
  questions: {
    total: number;
    pending: number;
    converted: number;
  };
  patterns: {
    total: number;
    avg_success_rate: number;
  };
}

export interface ConversationPattern {
  id: string;
  pattern_type: string;
  pattern_name: string;
  pattern_description: string;
  trigger_phrases: string[];
  successful_responses: Array<{
    response: string;
    context: Record<string, any>;
    added_at: string;
  }>;
  success_rate: number;
  times_used: number;
  is_active: boolean;
}

export function useAgentLearning() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Submeter feedback de mensagem (👍/👎)
  const submitFeedback = useCallback(async (data: FeedbackData) => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post('/agent-learning/feedback', data);
      return response.data;
    } catch (err: any) {
      const message = err.response?.data?.error || 'Erro ao enviar feedback';
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Listar perguntas detectadas
  const listDetectedQuestions = useCallback(async (agentId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/agent-learning/questions/${agentId}`);
      return response.data as { data: DetectedQuestion[]; total: number };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao listar perguntas');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Revisar pergunta detectada
  const reviewQuestion = useCallback(async (
    questionId: string,
    action: 'approve' | 'reject' | 'edit',
    answer?: string
  ) => {
    setLoading(true);
    try {
      const response = await api.post(`/agent-learning/questions/${questionId}/review`, {
        action,
        answer,
      });
      return response.data;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao revisar pergunta');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obter memória do lead
  const getLeadMemory = useCallback(async (leadId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/agent-learning/lead-memory/${leadId}`);
      return response.data as { exists: boolean; memory?: LeadMemory; context?: any };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao obter memória');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Listar padrões de conversa
  const listPatterns = useCallback(async (agentId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/agent-learning/patterns/${agentId}`);
      return response.data as { patterns: ConversationPattern[]; types: Record<string, string> };
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao listar padrões');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Obter estatísticas de aprendizado
  const getLearningStats = useCallback(async (agentId: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/agent-learning/stats/${agentId}`);
      return response.data as LearningStats;
    } catch (err: any) {
      setError(err.response?.data?.error || 'Erro ao obter estatísticas');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    submitFeedback,
    listDetectedQuestions,
    reviewQuestion,
    getLeadMemory,
    listPatterns,
    getLearningStats,
  };
}


