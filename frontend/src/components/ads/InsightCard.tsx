import { 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  Trophy,
  Lightbulb,
  DollarSign,
  Check,
  X,
  ChevronRight
} from 'lucide-react';
import type { AdInsight } from '@/hooks/useAds';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';

interface InsightCardProps {
  insight: AdInsight;
  compact?: boolean;
  onApply?: () => void;
  onDismiss?: () => void;
  isApplying?: boolean;
  isDismissing?: boolean;
}

const typeConfig = {
  performance_drop: { 
    icon: TrendingDown, 
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    iconColor: 'text-red-600 dark:text-red-400',
    borderColor: 'border-l-red-500'
  },
  opportunity: { 
    icon: TrendingUp, 
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-l-green-500'
  },
  budget_alert: { 
    icon: DollarSign, 
    bgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
    borderColor: 'border-l-yellow-500'
  },
  winner_ad: { 
    icon: Trophy, 
    bgColor: 'bg-green-100 dark:bg-green-900/30',
    iconColor: 'text-green-600 dark:text-green-400',
    borderColor: 'border-l-green-500'
  },
  suggestion: { 
    icon: Lightbulb, 
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    iconColor: 'text-blue-600 dark:text-blue-400',
    borderColor: 'border-l-blue-500'
  },
  anomaly: { 
    icon: AlertTriangle, 
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    iconColor: 'text-orange-600 dark:text-orange-400',
    borderColor: 'border-l-orange-500'
  },
};

const severityColors = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  warning: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  info: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  success: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export default function InsightCard({ 
  insight, 
  compact = false,
  onApply,
  onDismiss,
  isApplying,
  isDismissing
}: InsightCardProps) {
  const config = typeConfig[insight.type as keyof typeof typeConfig] || typeConfig.suggestion;
  const Icon = config.icon;

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border-l-4 ${config.borderColor} bg-gray-50 dark:bg-gray-800/50`}>
        <div className="flex items-start gap-3">
          <div className={`p-1.5 rounded ${config.bgColor}`}>
            <Icon className={`w-4 h-4 ${config.iconColor}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {insight.title}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {insight.entity_name || 'Geral'}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <Card className={`border-l-4 ${config.borderColor}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <div className={`p-2 rounded-lg ${config.bgColor}`}>
            <Icon className={`w-5 h-5 ${config.iconColor}`} />
          </div>
          
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {insight.title}
                  </h3>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${severityColors[insight.severity]}`}>
                    {insight.severity === 'critical' ? 'Crítico' :
                     insight.severity === 'warning' ? 'Aviso' :
                     insight.severity === 'success' ? 'Sucesso' : 'Info'}
                  </span>
                </div>
                
                {insight.entity_name && (
                  <p className="text-sm text-gray-500 mb-2">
                    {insight.entity_type}: {insight.entity_name}
                  </p>
                )}
                
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {insight.description}
                </p>
                
                {insight.recommendation && (
                  <p className="mt-2 text-sm text-blue-600 dark:text-blue-400">
                    💡 {insight.recommendation}
                  </p>
                )}

                {insight.data && Object.keys(insight.data).length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {insight.data.previous_ctr !== undefined && insight.data.current_ctr !== undefined && (
                      <>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          CTR anterior: {insight.data.previous_ctr.toFixed(2)}%
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                          CTR atual: {insight.data.current_ctr.toFixed(2)}%
                        </span>
                      </>
                    )}
                    {insight.data.performance_score !== undefined && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-xs">
                        Score: {insight.data.performance_score.toFixed(0)}/100
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {insight.suggested_action && insight.status === 'pending' && (
              <div className="mt-4 flex gap-2">
                {onApply && (
                  <Button 
                    size="sm" 
                    onClick={onApply}
                    disabled={isApplying || isDismissing}
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Aplicar
                  </Button>
                )}
                {onDismiss && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onDismiss}
                    disabled={isApplying || isDismissing}
                  >
                    <X className="w-4 h-4 mr-1" />
                    Dispensar
                  </Button>
                )}
              </div>
            )}

            {insight.status !== 'pending' && (
              <div className="mt-3">
                <span className={`px-2 py-1 text-xs rounded ${
                  insight.status === 'applied' 
                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                }`}>
                  {insight.status === 'applied' ? '✓ Aplicado' :
                   insight.status === 'dismissed' ? 'Dispensado' : insight.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

