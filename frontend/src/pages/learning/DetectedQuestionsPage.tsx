import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  HelpCircle,
  Check,
  X,
  Edit3,
  TrendingUp,
  Clock,
  MessageSquare,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { useAgentLearning } from '../../hooks/useAgentLearning';
import type { DetectedQuestion } from '../../hooks/useAgentLearning';

export const DetectedQuestionsPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { listDetectedQuestions, reviewQuestion, loading } = useAgentLearning();
  
  const [questions, setQuestions] = useState<DetectedQuestion[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<string | null>(null);
  const [editedAnswer, setEditedAnswer] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (agentId) {
      loadQuestions();
    }
  }, [agentId]);

  const loadQuestions = async () => {
    if (!agentId) return;
    try {
      const result = await listDetectedQuestions(agentId);
      setQuestions(result.data || []);
    } catch (err) {
      console.error('Erro ao carregar perguntas:', err);
    }
  };

  const handleApprove = async (questionId: string, answer?: string) => {
    try {
      await reviewQuestion(questionId, 'approve', answer);
      loadQuestions();
      setSelectedQuestion(null);
    } catch (err) {
      console.error('Erro ao aprovar:', err);
    }
  };

  const handleReject = async (questionId: string) => {
    try {
      await reviewQuestion(questionId, 'reject');
      loadQuestions();
    } catch (err) {
      console.error('Erro ao rejeitar:', err);
    }
  };

  const filteredQuestions = questions.filter(q => {
    if (filter === 'all') return true;
    return q.status === filter;
  });

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    approved: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    converted: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <PageHeader
          title="FAQs Automáticas"
          subtitle="Perguntas detectadas nas conversas que podem virar FAQs"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white dark:bg-muted rounded-lg p-4 border border-gray-200 dark:border-border">
          <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground mb-1">
            <HelpCircle className="w-4 h-4" />
            <span className="text-sm">Total Detectadas</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {questions.length}
          </div>
        </div>
        <div className="bg-white dark:bg-muted rounded-lg p-4 border border-gray-200 dark:border-border">
          <div className="flex items-center gap-2 text-yellow-500 mb-1">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Pendentes</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {questions.filter(q => q.status === 'pending').length}
          </div>
        </div>
        <div className="bg-white dark:bg-muted rounded-lg p-4 border border-gray-200 dark:border-border">
          <div className="flex items-center gap-2 text-green-500 mb-1">
            <Check className="w-4 h-4" />
            <span className="text-sm">Aprovadas</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {questions.filter(q => q.status === 'approved' || q.status === 'converted').length}
          </div>
        </div>
        <div className="bg-white dark:bg-muted rounded-lg p-4 border border-gray-200 dark:border-border">
          <div className="flex items-center gap-2 text-purple-500 mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Convertidas em FAQ</span>
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {questions.filter(q => q.status === 'converted').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-muted text-muted-foreground dark:text-muted-foreground hover:bg-gray-200 dark:hover:bg-accent'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendentes' : f === 'approved' ? 'Aprovadas' : 'Rejeitadas'}
          </button>
        ))}
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-muted rounded-lg border border-gray-200 dark:border-border">
            <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground dark:text-muted-foreground">
              Nenhuma pergunta {filter !== 'all' ? filter : ''} encontrada
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Perguntas frequentes serão detectadas automaticamente nas conversas
            </p>
          </div>
        ) : (
          filteredQuestions.map((question) => (
            <div
              key={question.id}
              className="bg-white dark:bg-muted rounded-lg border border-gray-200 dark:border-border overflow-hidden"
            >
              {/* Question Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-accent/50"
                onClick={() => setSelectedQuestion(
                  selectedQuestion === question.id ? null : question.id
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[question.status]}`}>
                        {question.status === 'pending' ? 'Pendente' : 
                         question.status === 'approved' ? 'Aprovada' :
                         question.status === 'converted' ? 'FAQ Criada' : 'Rejeitada'}
                      </span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="w-3 h-3" />
                        {question.occurrence_count}x
                      </span>
                    </div>
                    <p className="text-gray-900 dark:text-white font-medium">
                      {question.question}
                    </p>
                    {question.variations && question.variations.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        +{question.variations.length} variações
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {question.status === 'pending' && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleApprove(question.id, question.suggested_answer || '');
                          }}
                          className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                          title="Aprovar e criar FAQ"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReject(question.id);
                          }}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                          title="Rejeitar"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </>
                    )}
                    {selectedQuestion === question.id ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {selectedQuestion === question.id && (
                <div className="px-4 pb-4 border-t border-gray-200 dark:border-border">
                  <div className="pt-4 space-y-4">
                    {/* Suggested Answer */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-muted-foreground mb-2">
                        Resposta Sugerida
                      </label>
                      {question.status === 'pending' ? (
                        <textarea
                          value={editedAnswer || question.suggested_answer || ''}
                          onChange={(e) => setEditedAnswer(e.target.value)}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-border rounded-lg bg-white dark:bg-accent text-gray-900 dark:text-white"
                          placeholder="Digite ou edite a resposta..."
                        />
                      ) : (
                        <p className="p-3 bg-gray-50 dark:bg-accent/50 rounded-lg text-gray-700 dark:text-muted-foreground">
                          {question.suggested_answer || 'Sem resposta definida'}
                        </p>
                      )}
                    </div>

                    {/* Variations */}
                    {question.variations && question.variations.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-muted-foreground mb-2">
                          Variações Detectadas
                        </label>
                        <div className="space-y-1">
                          {question.variations.map((v, i) => (
                            <p key={i} className="text-sm text-muted-foreground dark:text-muted-foreground pl-3 border-l-2 border-gray-300 dark:border-border">
                              "{v}"
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    {question.status === 'pending' && (
                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          onClick={() => handleReject(question.id)}
                          className="px-4 py-2 text-muted-foreground dark:text-muted-foreground hover:bg-gray-100 dark:hover:bg-accent rounded-lg"
                        >
                          Rejeitar
                        </button>
                        <button
                          onClick={() => handleApprove(question.id, editedAnswer || question.suggested_answer || '')}
                          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          <Check className="w-4 h-4" />
                          Aprovar e Criar FAQ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

