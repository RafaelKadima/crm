import React, { useState } from 'react';
import { ThumbsUp, ThumbsDown, X, Send, MessageSquare } from 'lucide-react';
import { useAgentLearning } from '../../hooks/useAgentLearning';

interface MessageFeedbackProps {
  messageId: string;
  originalMessage: string;
  onFeedbackSent?: () => void;
}

export const MessageFeedback: React.FC<MessageFeedbackProps> = ({
  messageId,
  originalMessage,
  onFeedbackSent,
}) => {
  const { submitFeedback, loading } = useAgentLearning();
  const [feedbackGiven, setFeedbackGiven] = useState<'positive' | 'negative' | null>(null);
  const [showCorrectionForm, setShowCorrectionForm] = useState(false);
  const [correctedResponse, setCorrectedResponse] = useState('');
  const [feedbackReason, setFeedbackReason] = useState('');

  const handlePositiveFeedback = async () => {
    try {
      await submitFeedback({
        message_id: messageId,
        rating: 'positive',
      });
      setFeedbackGiven('positive');
      onFeedbackSent?.();
    } catch (err) {
      console.error('Erro ao enviar feedback positivo:', err);
    }
  };

  const handleNegativeFeedback = () => {
    setShowCorrectionForm(true);
  };

  const handleSubmitCorrection = async () => {
    try {
      await submitFeedback({
        message_id: messageId,
        rating: 'negative',
        corrected_response: correctedResponse || undefined,
        feedback_reason: feedbackReason || undefined,
      });
      setFeedbackGiven('negative');
      setShowCorrectionForm(false);
      onFeedbackSent?.();
    } catch (err) {
      console.error('Erro ao enviar correção:', err);
    }
  };

  // Se já deu feedback, mostra confirmação
  if (feedbackGiven) {
    return (
      <div className="flex items-center gap-1 text-xs">
        {feedbackGiven === 'positive' ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <ThumbsUp className="w-3 h-3" />
            Obrigado!
          </span>
        ) : (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <MessageSquare className="w-3 h-3" />
            Feedback registrado
          </span>
        )}
      </div>
    );
  }

  // Formulário de correção
  if (showCorrectionForm) {
    return (
      <div className="mt-2 p-3 bg-gray-50 dark:bg-muted rounded-lg border border-gray-200 dark:border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-muted-foreground">
            Ajude a melhorar a resposta
          </span>
          <button
            onClick={() => setShowCorrectionForm(false)}
            className="text-muted-foreground hover:text-muted-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              O que estava errado? (opcional)
            </label>
            <select
              value={feedbackReason}
              onChange={(e) => setFeedbackReason(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-border rounded bg-white dark:bg-accent"
            >
              <option value="">Selecione...</option>
              <option value="tom_inadequado">Tom inadequado</option>
              <option value="info_incorreta">Informação incorreta</option>
              <option value="resposta_incompleta">Resposta incompleta</option>
              <option value="nao_entendeu">Não entendeu a pergunta</option>
              <option value="muito_formal">Muito formal</option>
              <option value="muito_informal">Muito informal</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">
              Como deveria ter respondido? (opcional)
            </label>
            <textarea
              value={correctedResponse}
              onChange={(e) => setCorrectedResponse(e.target.value)}
              placeholder="Digite a resposta ideal..."
              rows={3}
              className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-border rounded bg-white dark:bg-accent resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCorrectionForm(false)}
              className="px-3 py-1 text-sm text-muted-foreground dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-accent rounded"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmitCorrection}
              disabled={loading}
              className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              <Send className="w-3 h-3" />
              Enviar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Botões de feedback
  return (
    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
      <button
        onClick={handlePositiveFeedback}
        disabled={loading}
        className="p-1 text-muted-foreground hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
        title="Resposta boa"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>
      <button
        onClick={handleNegativeFeedback}
        disabled={loading}
        className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
        title="Resposta pode melhorar"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

