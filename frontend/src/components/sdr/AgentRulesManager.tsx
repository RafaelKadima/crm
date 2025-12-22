import { useState } from 'react';
import {
  useAgentStageRules,
  useAgentEscalationRules,
  useCreateStageRule,
  useUpdateStageRule,
  useDeleteStageRule,
  useCreateEscalationRule,
  useUpdateEscalationRule,
  useDeleteEscalationRule,
  AgentStageRule,
  AgentEscalationRule,
  CONDITION_TYPES,
  ESCALATION_ACTIONS,
} from '@/hooks/useAgentRules';
import { usePipelines } from '@/hooks/usePipelines';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { Switch } from '@/components/ui/Switch';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/Dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  GitBranch,
  AlertTriangle,
  ArrowRight,
  Bell,
} from 'lucide-react';

interface AgentRulesManagerProps {
  agentId: string;
}

export function AgentRulesManager({ agentId }: AgentRulesManagerProps) {
  const [activeTab, setActiveTab] = useState('stage');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Regras do Agente</h3>
          <p className="text-sm text-muted-foreground">
            Configure como o agente deve se comportar em cada situação
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="stage" className="gap-2">
            <GitBranch className="h-4 w-4" />
            Regras por Estágio
          </TabsTrigger>
          <TabsTrigger value="escalation" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Regras de Escalação
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stage" className="mt-4">
          <StageRulesTab agentId={agentId} />
        </TabsContent>

        <TabsContent value="escalation" className="mt-4">
          <EscalationRulesTab agentId={agentId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== STAGE RULES TAB ====================

function StageRulesTab({ agentId }: { agentId: string }) {
  const { data, isLoading } = useAgentStageRules(agentId);
  const { data: pipelinesData } = usePipelines();
  const [editingRule, setEditingRule] = useState<AgentStageRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const createRule = useCreateStageRule();
  const updateRule = useUpdateStageRule();
  const deleteRule = useDeleteStageRule();

  const rules = data?.data || [];
  const pipelines = pipelinesData?.data || [];

  // Pega todos os estágios de todos os pipelines
  const allStages = pipelines.flatMap((p) =>
    (p.stages || []).map((s) => ({
      ...s,
      pipelineName: p.name,
    }))
  );

  const handleCreate = async (formData: Partial<AgentStageRule>) => {
    try {
      await createRule.mutateAsync({ agentId, data: formData });
      toast.success('Regra criada com sucesso!');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao criar regra');
    }
  };

  const handleUpdate = async (formData: Partial<AgentStageRule>) => {
    if (!editingRule) return;
    try {
      await updateRule.mutateAsync({ agentId, ruleId: editingRule.id, data: formData });
      toast.success('Regra atualizada!');
      setEditingRule(null);
    } catch (error) {
      toast.error('Erro ao atualizar regra');
    }
  };

  const handleDelete = async () => {
    if (!deleteRuleId) return;
    try {
      await deleteRule.mutateAsync({ agentId, ruleId: deleteRuleId });
      toast.success('Regra removida!');
      setDeleteRuleId(null);
    } catch (error) {
      toast.error('Erro ao remover regra');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma regra de estágio configurada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie regras para definir o comportamento do agente em cada estágio do funil
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {rule.stage && (
                        <Badge
                          style={{ backgroundColor: rule.stage.color, color: '#fff' }}
                        >
                          {rule.stage.name}
                        </Badge>
                      )}
                      {!rule.is_active && (
                        <Badge variant="secondary">Inativo</Badge>
                      )}
                      {rule.notify_human && (
                        <Badge variant="outline" className="gap-1">
                          <Bell className="h-3 w-3" />
                          Notifica
                        </Badge>
                      )}
                    </div>

                    {rule.trigger_condition && (
                      <p className="text-sm">
                        <span className="font-medium">Quando:</span> {rule.trigger_condition}
                      </p>
                    )}

                    {rule.action_template && (
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium">Ação:</span> {rule.action_template}
                      </p>
                    )}

                    {rule.auto_move_to_stage && (
                      <p className="text-sm flex items-center gap-1 mt-1">
                        <ArrowRight className="h-3 w-3" />
                        Mover para:{' '}
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: rule.auto_move_to_stage.color,
                            color: rule.auto_move_to_stage.color,
                          }}
                        >
                          {rule.auto_move_to_stage.name}
                        </Badge>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingRule(rule)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteRuleId(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de criação */}
      <StageRuleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        stages={allStages}
        isLoading={createRule.isPending}
      />

      {/* Dialog de edição */}
      <StageRuleDialog
        open={!!editingRule}
        onOpenChange={(open) => !open && setEditingRule(null)}
        onSubmit={handleUpdate}
        stages={allStages}
        initialData={editingRule || undefined}
        isLoading={updateRule.isPending}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={(open) => !open && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deleteRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Dialog para criar/editar regra de estágio
function StageRuleDialog({
  open,
  onOpenChange,
  onSubmit,
  stages,
  initialData,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<AgentStageRule>) => void;
  stages: Array<{ id: string; name: string; color: string; pipelineName: string }>;
  initialData?: AgentStageRule;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<AgentStageRule>>(
    initialData || {
      pipeline_stage_id: '',
      trigger_condition: '',
      action_template: '',
      auto_move_to: '',
      notify_human: false,
      priority: 0,
      is_active: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Regra' : 'Nova Regra de Estágio'}</DialogTitle>
          <DialogDescription>
            Configure o comportamento do agente para um estágio específico
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Estágio</Label>
            <Select
              value={formData.pipeline_stage_id}
              onValueChange={(v) => setFormData({ ...formData, pipeline_stage_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o estágio" />
              </SelectTrigger>
              <SelectContent>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                      <span className="text-muted-foreground text-xs">
                        ({stage.pipelineName})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Condição de Disparo</Label>
            <Input
              value={formData.trigger_condition || ''}
              onChange={(e) => setFormData({ ...formData, trigger_condition: e.target.value })}
              placeholder="Ex: cliente agendou visita, demonstrou interesse"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Palavras-chave separadas por vírgula
            </p>
          </div>

          <div>
            <Label>Ação do Agente</Label>
            <Textarea
              value={formData.action_template || ''}
              onChange={(e) => setFormData({ ...formData, action_template: e.target.value })}
              placeholder="Ex: Confirmar data e horário da visita"
              rows={2}
            />
          </div>

          <div>
            <Label>Mover Automaticamente Para</Label>
            <Select
              value={formData.auto_move_to || ''}
              onValueChange={(v) => setFormData({ ...formData, auto_move_to: v || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Opcional - selecione o estágio" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhum</SelectItem>
                {stages.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: stage.color }}
                      />
                      {stage.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Switch
                id="notify_human"
                checked={formData.notify_human}
                onCheckedChange={(c) => setFormData({ ...formData, notify_human: c })}
              />
              <Label htmlFor="notify_human">Notificar humano</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_active"
                checked={formData.is_active}
                onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
              />
              <Label htmlFor="is_active">Ativo</Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.pipeline_stage_id}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initialData ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ==================== ESCALATION RULES TAB ====================

function EscalationRulesTab({ agentId }: { agentId: string }) {
  const { data, isLoading } = useAgentEscalationRules(agentId);
  const [editingRule, setEditingRule] = useState<AgentEscalationRule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [deleteRuleId, setDeleteRuleId] = useState<string | null>(null);

  const createRule = useCreateEscalationRule();
  const updateRule = useUpdateEscalationRule();
  const deleteRule = useDeleteEscalationRule();

  const rules = data?.data || [];
  const conditionTypes = data?.condition_types || CONDITION_TYPES;
  const actions = data?.actions || ESCALATION_ACTIONS;

  const handleCreate = async (formData: Partial<AgentEscalationRule>) => {
    try {
      await createRule.mutateAsync({ agentId, data: formData });
      toast.success('Regra de escalação criada!');
      setIsCreateDialogOpen(false);
    } catch (error) {
      toast.error('Erro ao criar regra');
    }
  };

  const handleUpdate = async (formData: Partial<AgentEscalationRule>) => {
    if (!editingRule) return;
    try {
      await updateRule.mutateAsync({ agentId, ruleId: editingRule.id, data: formData });
      toast.success('Regra atualizada!');
      setEditingRule(null);
    } catch (error) {
      toast.error('Erro ao atualizar regra');
    }
  };

  const handleDelete = async () => {
    if (!deleteRuleId) return;
    try {
      await deleteRule.mutateAsync({ agentId, ruleId: deleteRuleId });
      toast.success('Regra removida!');
      setDeleteRuleId(null);
    } catch (error) {
      toast.error('Erro ao remover regra');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsCreateDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nova Regra
        </Button>
      </div>

      {rules.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Nenhuma regra de escalação configurada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Crie regras para definir quando o agente deve transferir para um humano
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline">
                        {conditionTypes[rule.condition_type as keyof typeof conditionTypes] ||
                          rule.condition_type}
                      </Badge>
                      <Badge>
                        {actions[rule.action as keyof typeof actions] || rule.action}
                      </Badge>
                      {!rule.is_active && <Badge variant="secondary">Inativo</Badge>}
                    </div>

                    <p className="text-sm">{rule.description}</p>

                    {rule.notification_template && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Mensagem: {rule.notification_template}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditingRule(rule)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteRuleId(rule.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog de criação */}
      <EscalationRuleDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreate}
        conditionTypes={conditionTypes}
        actions={actions}
        isLoading={createRule.isPending}
      />

      {/* Dialog de edição */}
      <EscalationRuleDialog
        open={!!editingRule}
        onOpenChange={(open) => !open && setEditingRule(null)}
        onSubmit={handleUpdate}
        conditionTypes={conditionTypes}
        actions={actions}
        initialData={editingRule || undefined}
        isLoading={updateRule.isPending}
      />

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!deleteRuleId} onOpenChange={(open) => !open && setDeleteRuleId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              {deleteRule.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Dialog para criar/editar regra de escalação
function EscalationRuleDialog({
  open,
  onOpenChange,
  onSubmit,
  conditionTypes,
  actions,
  initialData,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Partial<AgentEscalationRule>) => void;
  conditionTypes: Record<string, string>;
  actions: Record<string, string>;
  initialData?: AgentEscalationRule;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<Partial<AgentEscalationRule>>(
    initialData || {
      condition_type: 'explicit_request',
      condition_value: '',
      action: 'notify_owner',
      notification_template: '',
      priority: 0,
      is_active: true,
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const getConditionPlaceholder = () => {
    switch (formData.condition_type) {
      case 'keyword':
        return 'Ex: reclamação, problema, urgente';
      case 'sentiment':
        return 'Ex: negative, very_negative';
      case 'time_in_stage':
        return 'Ex: 24h, 48h, 7d';
      case 'message_count':
        return 'Ex: 5, 10';
      default:
        return 'Valor da condição';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Editar Regra de Escalação' : 'Nova Regra de Escalação'}
          </DialogTitle>
          <DialogDescription>
            Configure quando o agente deve transferir a conversa para um humano
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de Condição</Label>
            <Select
              value={formData.condition_type}
              onValueChange={(v) => setFormData({ ...formData, condition_type: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(conditionTypes).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Valor da Condição</Label>
            <Input
              value={formData.condition_value || ''}
              onChange={(e) => setFormData({ ...formData, condition_value: e.target.value })}
              placeholder={getConditionPlaceholder()}
            />
          </div>

          <div>
            <Label>Ação</Label>
            <Select
              value={formData.action}
              onValueChange={(v) => setFormData({ ...formData, action: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(actions).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Mensagem de Notificação (opcional)</Label>
            <Textarea
              value={formData.notification_template || ''}
              onChange={(e) =>
                setFormData({ ...formData, notification_template: e.target.value })
              }
              placeholder="Mensagem a ser enviada ao responsável"
              rows={2}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Switch
              id="is_active_esc"
              checked={formData.is_active}
              onCheckedChange={(c) => setFormData({ ...formData, is_active: c })}
            />
            <Label htmlFor="is_active_esc">Regra ativa</Label>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.condition_type || !formData.condition_value}
            >
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {initialData ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}





