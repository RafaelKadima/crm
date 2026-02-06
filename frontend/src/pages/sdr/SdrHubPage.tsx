import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  Bot,
  Brain,
  HelpCircle,
  Settings,
  Plus,
  ChevronRight,
  Sparkles,
  MessageSquare,
  TrendingUp,
  Zap,
  Users,
  Clock,
  CheckCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import api from '../../api/axios';

interface SdrAgent {
  id: string;
  name: string;
  is_active: boolean;
  personality?: string;
  created_at: string;
  stats?: {
    total_conversations: number;
    avg_response_time: number;
    satisfaction_rate: number;
  };
}

export const SdrHubPage: React.FC = () => {
  const { t } = useTranslation();
  const [agents, setAgents] = useState<SdrAgent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      const response = await api.get('/sdr-agents');
      setAgents(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar agentes:', err);
    } finally {
      setLoading(false);
    }
  };

  const menuItems = [
    {
      id: 'create',
      title: t('sdr.createNewSdr'),
      description: t('sdr.createNewSdrDesc'),
      icon: Plus,
      color: 'from-green-500 to-emerald-600',
      link: '/sdr/create',
    },
  ];

  const agentMenuItems = (agentId: string) => [
    {
      id: 'config',
      title: t('sdr.settings'),
      description: t('sdr.settingsDesc'),
      icon: Settings,
      color: 'from-blue-500 to-indigo-600',
      link: `/sdr/${agentId}/config`,
    },
    {
      id: 'learning',
      title: t('sdr.learningDashboard'),
      description: t('sdr.learningDashboardDesc'),
      icon: Brain,
      color: 'from-purple-500 to-violet-600',
      link: `/sdr/${agentId}/learning`,
    },
    {
      id: 'faqs',
      title: t('sdr.autoFaqs'),
      description: t('sdr.autoFaqsDesc'),
      icon: HelpCircle,
      color: 'from-amber-500 to-orange-600',
      link: `/sdr/${agentId}/questions`,
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <PageHeader
          title={t('sdr.title')}
          subtitle={t('sdr.subtitle')}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-white dark:bg-muted rounded-xl p-4 border border-gray-200 dark:border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{agents.length}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">{t('sdr.sdrAgents')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-muted rounded-xl p-4 border border-gray-200 dark:border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {agents.filter(a => a.is_active).length}
              </p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">{t('sdr.active')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-muted rounded-xl p-4 border border-gray-200 dark:border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <MessageSquare className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">{t('sdr.conversationsToday')}</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-muted rounded-xl p-4 border border-gray-200 dark:border-border shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
              <TrendingUp className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">--</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">{t('sdr.successRate')}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Create New SDR Card */}
      <div className="mb-8">
        <Link
          to="/sdr/create"
          className="block bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-6 text-white hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-lg">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-semibold">{t('sdr.createNewAgent')}</h3>
                <p className="text-green-100">{t('sdr.createNewAgentDesc')}</p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6" />
          </div>
        </Link>
      </div>

      {/* Existing Agents */}
      {agents.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            {t('sdr.yourAgents')}
          </h2>

          {agents.map((agent) => (
            <div
              key={agent.id}
              className="bg-white dark:bg-muted rounded-xl border border-gray-200 dark:border-border overflow-hidden shadow-sm"
            >
              {/* Agent Header */}
              <div className="p-5 border-b border-gray-200 dark:border-border bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-750">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
                      <Bot className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {agent.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          agent.is_active 
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-muted-foreground dark:bg-accent dark:text-muted-foreground'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${agent.is_active ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                          {agent.is_active ? t('sdr.active') : t('sdr.inactive')}
                        </span>
                        {agent.personality && (
                          <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                            {agent.personality}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agent Menu */}
              <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-gray-700">
                {agentMenuItems(agent.id).map((item) => (
                  <Link
                    key={item.id}
                    to={item.link}
                    className="p-5 hover:bg-gray-50 dark:hover:bg-accent/50 transition-colors group"
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`p-3 rounded-xl bg-gradient-to-br ${item.color} mb-3 group-hover:scale-110 transition-transform`}>
                        <item.icon className="w-5 h-5 text-white" />
                      </div>
                      <h4 className="font-medium text-gray-900 dark:text-white mb-1">
                        {item.title}
                      </h4>
                      <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {agents.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-muted rounded-xl border border-gray-200 dark:border-border">
          <Bot className="w-16 h-16 text-muted-foreground dark:text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('sdr.noAgentConfigured')}
          </h3>
          <p className="text-muted-foreground dark:text-muted-foreground mb-6 max-w-md mx-auto">
            {t('sdr.noAgentConfiguredDesc')}
          </p>
          <Link
            to="/sdr/create"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('sdr.createFirstAgent')}
          </Link>
        </div>
      )}

      {/* Features Info */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-5 border border-blue-100 dark:border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h4 className="font-medium text-gray-900 dark:text-white">{t('sdr.instantResponses')}</h4>
          </div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {t('sdr.instantResponsesDesc')}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl p-5 border border-purple-100 dark:border-purple-800">
          <div className="flex items-center gap-3 mb-3">
            <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h4 className="font-medium text-gray-900 dark:text-white">{t('sdr.continuousLearning')}</h4>
          </div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {t('sdr.continuousLearningDesc')}
          </p>
        </div>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-5 border border-amber-100 dark:border-amber-800">
          <div className="flex items-center gap-3 mb-3">
            <Users className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <h4 className="font-medium text-gray-900 dark:text-white">{t('sdr.smartQualification')}</h4>
          </div>
          <p className="text-sm text-muted-foreground dark:text-muted-foreground">
            {t('sdr.smartQualificationDesc')}
          </p>
        </div>
      </div>
    </div>
  );
};

