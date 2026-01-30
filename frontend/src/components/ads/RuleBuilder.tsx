import { useState, useEffect } from 'react';
import { 
  useCreateAutomationRule, 
  useUpdateAutomationRule,
  type AdAutomationRule 
} from '@/hooks/useAds';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';

interface RuleBuilderProps {
  rule?: AdAutomationRule | null;
  onSave: () => void;
  onCancel: () => void;
}

const METRICS = [
  { id: 'cpc', name: 'CPC (Custo por Clique)' },
  { id: 'ctr', name: 'CTR (Taxa de Clique)' },
  { id: 'cpm', name: 'CPM (Custo por Mil)' },
  { id: 'roas', name: 'ROAS (Retorno)' },
  { id: 'spend', name: 'Gasto Total' },
  { id: 'conversions', name: 'Conversões' },
  { id: 'impressions', name: 'Impressões' },
  { id: 'clicks', name: 'Cliques' },
  { id: 'cost_per_conversion', name: 'Custo por Conversão' },
];

const OPERATORS = [
  { id: '>', name: 'maior que' },
  { id: '<', name: 'menor que' },
  { id: '>=', name: 'maior ou igual a' },
  { id: '<=', name: 'menor ou igual a' },
  { id: '=', name: 'igual a' },
];

const ACTIONS = [
  { id: 'pause_ad', name: 'Pausar Anúncio', hasPercent: false },
  { id: 'resume_ad', name: 'Ativar Anúncio', hasPercent: false },
  { id: 'increase_budget', name: 'Aumentar Orçamento', hasPercent: true },
  { id: 'decrease_budget', name: 'Reduzir Orçamento', hasPercent: true },
  { id: 'duplicate_adset', name: 'Duplicar Conjunto', hasPercent: false },
  { id: 'create_alert', name: 'Criar Alerta', hasPercent: false, hasMessage: true },
];

const FREQUENCIES = [
  { id: 'hourly', name: 'A cada hora' },
  { id: 'daily', name: 'Diariamente' },
  { id: 'weekly', name: 'Semanalmente' },
];

const SCOPES = [
  { id: 'ad', name: 'Anúncios' },
  { id: 'adset', name: 'Conjuntos de Anúncio' },
  { id: 'campaign', name: 'Campanhas' },
];

export default function RuleBuilder({ rule, onSave, onCancel }: RuleBuilderProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    scope: 'ad',
    condition: {
      metric: 'cpc',
      operator: '>',
      value: 0,
      duration_days: 2,
      aggregation: 'avg',
    },
    action: {
      type: 'pause_ad',
      params: {} as Record<string, any>,
    },
    frequency: 'daily',
    cooldown_hours: 24,
    requires_approval: false,
  });

  const createMutation = useCreateAutomationRule();
  const updateMutation = useUpdateAutomationRule();

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description || '',
        scope: rule.scope,
        condition: rule.condition,
        action: rule.action,
        frequency: rule.frequency,
        cooldown_hours: rule.cooldown_hours,
        requires_approval: rule.requires_approval,
      });
    }
  }, [rule]);

  const selectedAction = ACTIONS.find(a => a.id === formData.action.type);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (rule) {
        await updateMutation.mutateAsync({ ruleId: rule.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save rule:', error);
    }
  };

  const updateCondition = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      condition: { ...prev.condition, [key]: value },
    }));
  };

  const updateAction = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      action: { ...prev.action, [key]: value },
    }));
  };

  const updateActionParams = (key: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      action: { 
        ...prev.action, 
        params: { ...prev.action.params, [key]: value } 
      },
    }));
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Nome e Descrição */}
      <div className="space-y-4">
        <div>
          <Label htmlFor="name">Nome da Regra</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ex: Pausar ads com CPC alto"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="description">Descrição (opcional)</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Descreva o que esta regra faz"
          />
        </div>
      </div>

      {/* Escopo */}
      <div>
        <Label>Aplicar em</Label>
        <div className="flex gap-2 mt-2">
          {SCOPES.map((scope) => (
            <button
              key={scope.id}
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, scope: scope.id }))}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                formData.scope === scope.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-muted text-gray-700 dark:text-muted-foreground hover:bg-gray-200'
              }`}
            >
              {scope.name}
            </button>
          ))}
        </div>
      </div>

      {/* Condição */}
      <div className="bg-gray-50 dark:bg-muted/50 p-4 rounded-lg">
        <Label className="text-base font-semibold mb-3 block">SE (Condição)</Label>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">Métrica</Label>
            <select
              value={formData.condition.metric}
              onChange={(e) => updateCondition('metric', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white dark:bg-muted border border-gray-300 dark:border-border rounded-lg text-sm"
            >
              {METRICS.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <Label className="text-xs">Operador</Label>
            <select
              value={formData.condition.operator}
              onChange={(e) => updateCondition('operator', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white dark:bg-muted border border-gray-300 dark:border-border rounded-lg text-sm"
            >
              {OPERATORS.map((op) => (
                <option key={op.id} value={op.id}>{op.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <Label className="text-xs">Valor</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.condition.value}
              onChange={(e) => updateCondition('value', parseFloat(e.target.value))}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-xs">Por quantos dias</Label>
            <Input
              type="number"
              min="1"
              max="30"
              value={formData.condition.duration_days}
              onChange={(e) => updateCondition('duration_days', parseInt(e.target.value))}
              className="mt-1"
            />
          </div>
        </div>
      </div>

      {/* Ação */}
      <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
        <Label className="text-base font-semibold mb-3 block">ENTÃO (Ação)</Label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">Ação</Label>
            <select
              value={formData.action.type}
              onChange={(e) => updateAction('type', e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white dark:bg-muted border border-gray-300 dark:border-border rounded-lg text-sm"
            >
              {ACTIONS.map((action) => (
                <option key={action.id} value={action.id}>{action.name}</option>
              ))}
            </select>
          </div>
          
          {selectedAction?.hasPercent && (
            <div>
              <Label className="text-xs">Percentual (%)</Label>
              <Input
                type="number"
                min="1"
                max="100"
                value={formData.action.params.percent || 20}
                onChange={(e) => updateActionParams('percent', parseInt(e.target.value))}
                className="mt-1"
              />
            </div>
          )}
          
          {selectedAction?.hasMessage && (
            <div className="md:col-span-2">
              <Label className="text-xs">Mensagem do Alerta</Label>
              <Input
                value={formData.action.params.message || ''}
                onChange={(e) => updateActionParams('message', e.target.value)}
                placeholder="Mensagem do alerta"
                className="mt-1"
              />
            </div>
          )}
        </div>
      </div>

      {/* Configurações */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Frequência de Verificação</Label>
          <select
            value={formData.frequency}
            onChange={(e) => setFormData(prev => ({ ...prev, frequency: e.target.value }))}
            className="w-full mt-1 px-3 py-2 bg-white dark:bg-muted border border-gray-300 dark:border-border rounded-lg text-sm"
          >
            {FREQUENCIES.map((freq) => (
              <option key={freq.id} value={freq.id}>{freq.name}</option>
            ))}
          </select>
        </div>
        
        <div>
          <Label>Cooldown (horas)</Label>
          <Input
            type="number"
            min="1"
            max="168"
            value={formData.cooldown_hours}
            onChange={(e) => setFormData(prev => ({ ...prev, cooldown_hours: parseInt(e.target.value) }))}
            className="mt-1"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Tempo mínimo entre execuções na mesma entidade
          </p>
        </div>
        
        <div className="flex items-center mt-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.requires_approval}
              onChange={(e) => setFormData(prev => ({ ...prev, requires_approval: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300"
            />
            <span className="text-sm">Requer aprovação manual</span>
          </label>
        </div>
      </div>

      {/* Botões */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading || !formData.name}>
          {isLoading ? (
            <>
              <Spinner className="w-4 h-4 mr-2" />
              Salvando...
            </>
          ) : rule ? 'Atualizar Regra' : 'Criar Regra'}
        </Button>
      </div>
    </form>
  );
}

