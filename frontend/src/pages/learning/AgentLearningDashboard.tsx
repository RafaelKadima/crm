import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Brain,
  ThumbsUp,
  ThumbsDown,
  HelpCircle,
  TrendingUp,
  Sparkles,
  MessageSquare,
  Target,
  Award,
  ArrowRight,
  BarChart3,
  Lightbulb,
  RefreshCw,
} from 'lucide-react';
import { useAgentLearning } from '../../hooks/useAgentLearning';
import type { LearningStats, ConversationPattern } from '../../hooks/useAgentLearning';

export const AgentLearningDashboard: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const { getLearningStats, listPatterns, loading } = useAgentLearning();
  
  const [stats, setStats] = useState<LearningStats | null>(null);
  const [patterns, setPatterns] = useState<ConversationPattern[]>([]);
  const [patternTypes, setPatternTypes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (agentId) {
      loadData();
    }
  }, [agentId]);

  const loadData = async () => {
    if (!agentId) return;
    
    try {
      const [statsResult, patternsResult] = await Promise.all([
        getLearningStats(agentId),
        listPatterns(agentId),
      ]);
      
      setStats(statsResult);
      setPatterns(patternsResult.patterns || []);
      setPatternTypes(patternsResult.types || {});
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    }
  };

  const StatCard = ({ 
    icon: Icon, 
    label, 
    value, 
    subValue, 
    color 
  }: { 
    icon: React.ElementType;
    label: string;
    value: string | number;
    subValue?: string;
    color: string;
  }) => (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex items-start justify-between">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900 dark:text-white">
          {value}
        </div>
        <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {label}
        </div>
        {subValue && (
          <div className="text-xs text-gray-400 mt-1">
            {subValue}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl shadow-lg">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Central de Aprendizado
              </h1>
              <p className="text-gray-500 dark:text-gray-400">
                Acompanhe como o agente está evoluindo com cada interação
              </p>
            </div>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={MessageSquare}
          label="Total de Feedbacks"
          value={stats?.feedback?.total || 0}
          subValue={`${stats?.feedback?.processed || 0} processados`}
          color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
        />
        <StatCard
          icon={ThumbsUp}
          label="Taxa de Aprovação"
          value={`${stats?.feedback?.positive_rate || 0}%`}
          subValue={`${stats?.feedback?.positive || 0} positivos`}
          color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
        />
        <StatCard
          icon={HelpCircle}
          label="FAQs Pendentes"
          value={stats?.questions?.pending || 0}
          subValue={`${stats?.questions?.converted || 0} convertidas`}
          color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
        />
        <StatCard
          icon={Sparkles}
          label="Padrões Aprendidos"
          value={stats?.patterns?.total || 0}
          subValue={`${Math.round((stats?.patterns?.avg_success_rate || 0) * 100)}% sucesso`}
          color="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Overview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-500" />
              Visão Geral de Feedbacks
            </h2>
          </div>

          <div className="space-y-4">
            {/* Positive/Negative Bar */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Distribuição</span>
                <span className="text-gray-900 dark:text-white font-medium">
                  {stats?.feedback?.total || 0} feedbacks
                </span>
              </div>
              <div className="flex h-4 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700">
                <div
                  className="bg-green-500 transition-all"
                  style={{ 
                    width: `${stats?.feedback?.positive_rate || 0}%` 
                  }}
                />
                <div
                  className="bg-red-500 transition-all"
                  style={{ 
                    width: `${100 - (stats?.feedback?.positive_rate || 0)}%` 
                  }}
                />
              </div>
              <div className="flex justify-between text-xs mt-2">
                <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                  <ThumbsUp className="w-3 h-3" />
                  {stats?.feedback?.positive || 0} positivos
                </span>
                <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                  <ThumbsDown className="w-3 h-3" />
                  {stats?.feedback?.negative || 0} negativos
                </span>
              </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                  <Award className="w-4 h-4" />
                  <span className="text-sm font-medium">Padrões Reforçados</span>
                </div>
                <p className="text-xs text-green-600 dark:text-green-500">
                  Feedbacks positivos reforçam boas respostas
                </p>
              </div>
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-1">
                  <Lightbulb className="w-4 h-4" />
                  <span className="text-sm font-medium">Correções Aplicadas</span>
                </div>
                <p className="text-xs text-blue-600 dark:text-blue-500">
                  {stats?.feedback?.negative || 0} correções ensinadas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-purple-500" />
            Ações Rápidas
          </h2>

          <div className="space-y-3">
            <Link
              to={`/sdr-agents/${agentId}/detected-questions`}
              className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/50 rounded-lg">
                  <HelpCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Revisar FAQs Pendentes
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {stats?.questions?.pending || 0} perguntas aguardando
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </Link>

            <Link
              to={`/sdr-agents/${agentId}/faqs`}
              className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/50 rounded-lg">
                  <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Gerenciar Base de Conhecimento
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    FAQs e documentos do agente
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </Link>

            <Link
              to={`/sdr-agents/${agentId}/patterns`}
              className="flex items-center justify-between p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                  <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    Ver Padrões Aprendidos
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {stats?.patterns?.total || 0} padrões identificados
                  </div>
                </div>
              </div>
              <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </Link>
          </div>
        </div>
      </div>

      {/* Patterns Preview */}
      {patterns.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Padrões de Sucesso Recentes
            </h2>
            <Link
              to={`/sdr-agents/${agentId}/patterns`}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Ver todos
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {patterns.slice(0, 3).map((pattern) => (
              <div
                key={pattern.id}
                className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 rounded-full text-xs">
                    {patternTypes[pattern.pattern_type] || pattern.pattern_type}
                  </span>
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {Math.round(pattern.success_rate * 100)}% sucesso
                  </span>
                </div>
                <h3 className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                  {pattern.pattern_name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2">
                  {pattern.pattern_description}
                </p>
                <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                  <TrendingUp className="w-3 h-3" />
                  Usado {pattern.times_used}x
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* How it Works */}
      <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Brain className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Como o Agente Aprende
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
              <ThumbsUp className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                Feedbacks
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Usuários avaliam respostas com 👍/👎
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
              <HelpCircle className="w-4 h-4 text-yellow-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                FAQs Auto
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Detecta perguntas frequentes
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
              <TrendingUp className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                Padrões
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Analisa conversas bem-sucedidas
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow">
              <Sparkles className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="font-medium text-gray-900 dark:text-white text-sm">
                Evolui
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Melhora continuamente
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

