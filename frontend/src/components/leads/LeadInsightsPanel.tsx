import React, { useState, useEffect } from 'react';
import {
  Brain,
  TrendingUp,
  AlertCircle,
  Heart,
  MessageCircle,
  Calendar,
  Clock,
  Target,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Zap,
} from 'lucide-react';
import { useAgentLearning } from '../../hooks/useAgentLearning';
import type { LeadMemory } from '../../hooks/useAgentLearning';

interface LeadInsightsPanelProps {
  leadId: string;
}

export const LeadInsightsPanel: React.FC<LeadInsightsPanelProps> = ({ leadId }) => {
  const { getLeadMemory, loading } = useAgentLearning();
  const [memory, setMemory] = useState<LeadMemory | null>(null);
  const [exists, setExists] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    loadMemory();
  }, [leadId]);

  const loadMemory = async () => {
    try {
      const result = await getLeadMemory(leadId);
      setExists(result.exists);
      if (result.exists && result.context) {
        setMemory(result.context);
      }
    } catch (err) {
      console.error('Erro ao carregar insights:', err);
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-3" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
      </div>
    );
  }

  if (!exists) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
          <Brain className="w-5 h-5" />
          <span className="text-sm">Insights serão gerados após mais interações</span>
        </div>
      </div>
    );
  }

  const getConversionColor = (prob: number) => {
    if (prob >= 0.7) return 'text-green-600 dark:text-green-400';
    if (prob >= 0.4) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getConversionLabel = (prob: number) => {
    if (prob >= 0.7) return 'Alta';
    if (prob >= 0.4) return 'Média';
    return 'Baixa';
  };

  return (
    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
            <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          </div>
          <span className="font-medium text-gray-900 dark:text-white">
            Insights da IA
          </span>
          <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/50 rounded-full text-xs text-purple-600 dark:text-purple-400">
            {memory?.total_interactions || 0} interações
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </div>

      {expanded && memory && (
        <div className="px-4 pb-4 space-y-4">
          {/* Conversion Probability */}
          {memory.conversion_probability !== undefined && (
            <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Probabilidade de Conversão
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold ${getConversionColor(memory.conversion_probability)}`}>
                  {Math.round(memory.conversion_probability * 100)}%
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  memory.conversion_probability >= 0.7 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                    : memory.conversion_probability >= 0.4
                    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {getConversionLabel(memory.conversion_probability)}
                </span>
              </div>
            </div>
          )}

          {/* Recommended Approach */}
          {memory.recommended_approach && (
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Abordagem Recomendada
                </span>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {memory.recommended_approach}
              </p>
            </div>
          )}

          {/* Interests & Pain Points */}
          <div className="grid grid-cols-2 gap-3">
            {/* Interests */}
            {memory.interests && memory.interests.length > 0 && (
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-pink-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Interesses
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {memory.interests.map((interest, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400 rounded-full text-xs"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pain Points */}
            {memory.pain_points && memory.pain_points.length > 0 && (
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    Dores
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {memory.pain_points.map((pain, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 rounded-full text-xs"
                    >
                      {pain}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Communication Style & Decision Pattern */}
          <div className="grid grid-cols-2 gap-3">
            {memory.communication_style && (
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <MessageCircle className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-gray-500">Estilo</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {memory.communication_style}
                </span>
              </div>
            )}

            {memory.decision_pattern && (
              <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="w-4 h-4 text-yellow-500" />
                  <span className="text-xs text-gray-500">Decisão</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                  {memory.decision_pattern}
                </span>
              </div>
            )}
          </div>

          {/* Last Objections */}
          {memory.objections_history && memory.objections_history.length > 0 && (
            <div className="p-3 bg-white dark:bg-gray-800 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-red-500" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                  Últimas Objeções
                </span>
              </div>
              <div className="space-y-2">
                {memory.objections_history.slice(-3).map((obj, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-gray-700 dark:text-gray-300">
                      "{obj.objection}"
                    </p>
                    {obj.response && (
                      <p className="text-gray-500 dark:text-gray-500 mt-0.5 pl-2 border-l-2 border-gray-200 dark:border-gray-700">
                        Resposta: {obj.response}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-center">
              <div className="text-lg font-bold text-gray-900 dark:text-white">
                {memory.total_interactions || 0}
              </div>
              <div className="text-xs text-gray-500">Interações</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {memory.positive_rate || 0}%
              </div>
              <div className="text-xs text-gray-500">Taxa Positiva</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                {memory.meeting_attendance_rate || 0}%
              </div>
              <div className="text-xs text-gray-500">Comparecimento</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

