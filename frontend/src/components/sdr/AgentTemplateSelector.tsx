import { useState } from 'react';
import {
  useAgentTemplates,
  useAgentTemplate,
  useApplyTemplate,
  useCreateAgentFromTemplate,
} from '@/hooks/useAgentTemplates';
import { Button } from '@/components/ui/Button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/Dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Checkbox } from '@/components/ui/Checkbox';
import { toast } from 'sonner';
import { Wand2, Loader2, ChevronRight, Sparkles } from 'lucide-react';

interface AgentTemplateSelectorProps {
  agentId?: string;
  onAgentCreated?: (agentId: string) => void;
  mode?: 'apply' | 'create' | 'both';
}

export function AgentTemplateSelector({
  agentId,
  onAgentCreated,
  mode = 'both',
}: AgentTemplateSelectorProps) {
  const [open, setOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | undefined>();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [newAgentName, setNewAgentName] = useState('');
  const [overwrite, setOverwrite] = useState(false);

  const { data: templatesData, isLoading: loadingTemplates } = useAgentTemplates(selectedCategory);
  const { data: templateData, isLoading: loadingTemplate } = useAgentTemplate(selectedTemplateId);

  const applyTemplate = useApplyTemplate();
  const createFromTemplate = useCreateAgentFromTemplate();

  const templates = templatesData?.data || [];
  const categories = templatesData?.categories || {};
  const selectedTemplate = templateData?.data;

  const handleApply = async () => {
    if (!agentId || !selectedTemplateId) return;

    try {
      await applyTemplate.mutateAsync({
        templateId: selectedTemplateId,
        agentId,
        overwrite,
      });
      toast.success('Template aplicado com sucesso!');
      setOpen(false);
      resetSelection();
    } catch (error) {
      toast.error('Erro ao aplicar template');
    }
  };

  const handleCreate = async () => {
    if (!selectedTemplateId || !newAgentName.trim()) return;

    try {
      const result = await createFromTemplate.mutateAsync({
        templateId: selectedTemplateId,
        name: newAgentName.trim(),
      });
      toast.success('Agente criado com sucesso!');
      setOpen(false);
      resetSelection();
      onAgentCreated?.(result.data.id);
    } catch (error) {
      toast.error('Erro ao criar agente');
    }
  };

  const resetSelection = () => {
    setSelectedTemplateId(undefined);
    setNewAgentName('');
    setOverwrite(false);
  };

  const isApplying = applyTemplate.isPending;
  const isCreating = createFromTemplate.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Wand2 className="h-4 w-4 mr-2" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Templates de Agente
          </DialogTitle>
          <DialogDescription>
            Use templates pré-configurados para criar ou configurar seu agente rapidamente.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {!selectedTemplateId ? (
            // Lista de templates
            <div className="space-y-4">
              {/* Filtro por categoria */}
              <Tabs
                value={selectedCategory || 'all'}
                onValueChange={(v) => setSelectedCategory(v === 'all' ? undefined : v)}
              >
                <TabsList className="flex flex-wrap h-auto gap-1">
                  <TabsTrigger value="all" className="text-xs">
                    Todos
                  </TabsTrigger>
                  {Object.entries(categories).map(([key, info]) => (
                    <TabsTrigger key={key} value={key} className="text-xs">
                      {info.icon} {info.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>

              {/* Grid de templates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
                {loadingTemplates ? (
                  <div className="col-span-2 flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : templates.length === 0 ? (
                  <div className="col-span-2 text-center py-8 text-muted-foreground">
                    Nenhum template encontrado
                  </div>
                ) : (
                  templates.map((template) => (
                    <Card
                      key={template.id}
                      className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setSelectedTemplateId(template.id)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{template.icon || template.category_icon}</span>
                            <div>
                              <CardTitle className="text-base">{template.name}</CardTitle>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {template.category_name}
                              </Badge>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-xs line-clamp-2">
                          {template.description}
                        </CardDescription>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          ) : (
            // Detalhes do template selecionado
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {loadingTemplate ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : selectedTemplate ? (
                <>
                  {/* Header do template */}
                  <div className="flex items-start gap-4 pb-4 border-b">
                    <span className="text-4xl">{selectedTemplate.icon || selectedTemplate.category_icon}</span>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                      <Badge variant="secondary">{selectedTemplate.category_name}</Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        {selectedTemplate.description}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={resetSelection}>
                      Voltar
                    </Button>
                  </div>

                  {/* Conteúdo do template */}
                  <Tabs defaultValue="prompt" className="w-full">
                    <TabsList>
                      <TabsTrigger value="prompt">Prompt</TabsTrigger>
                      <TabsTrigger value="personality">Personalidade</TabsTrigger>
                      <TabsTrigger value="stages">Estágios</TabsTrigger>
                      <TabsTrigger value="rules">Regras</TabsTrigger>
                    </TabsList>

                    <TabsContent value="prompt" className="mt-4">
                      <div className="bg-muted p-4 rounded-lg text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                        {selectedTemplate.system_prompt}
                      </div>
                    </TabsContent>

                    <TabsContent value="personality" className="mt-4 space-y-4">
                      {selectedTemplate.personality && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Personalidade</Label>
                          <p className="text-sm mt-1">{selectedTemplate.personality}</p>
                        </div>
                      )}
                      {selectedTemplate.objectives && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Objetivos</Label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{selectedTemplate.objectives}</p>
                        </div>
                      )}
                      {selectedTemplate.restrictions && (
                        <div>
                          <Label className="text-xs text-muted-foreground">Restrições</Label>
                          <p className="text-sm mt-1 whitespace-pre-wrap">{selectedTemplate.restrictions}</p>
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="stages" className="mt-4">
                      {selectedTemplate.recommended_stages?.length ? (
                        <div className="space-y-2">
                          {selectedTemplate.recommended_stages.map((stage, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-2 rounded bg-muted"
                            >
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              <span className="text-sm font-medium">{stage.name}</span>
                              <Badge variant="outline" className="text-xs ml-auto">
                                Ordem: {stage.order}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhum estágio recomendado
                        </p>
                      )}
                    </TabsContent>

                    <TabsContent value="rules" className="mt-4">
                      {selectedTemplate.example_rules?.length ? (
                        <div className="space-y-2">
                          {selectedTemplate.example_rules.map((rule, idx) => (
                            <div key={idx} className="p-3 rounded bg-muted text-sm">
                              <p>
                                <span className="font-medium">Quando:</span> {rule.trigger}
                              </p>
                              <p>
                                <span className="font-medium">Ação:</span> {rule.action}
                              </p>
                              <p>
                                <span className="font-medium">Mover para:</span> {rule.move_to}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Nenhuma regra de exemplo
                        </p>
                      )}
                    </TabsContent>
                  </Tabs>

                  {/* Ações */}
                  <div className="pt-4 border-t space-y-4">
                    {(mode === 'apply' || mode === 'both') && agentId && (
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id="overwrite"
                            checked={overwrite}
                            onCheckedChange={(c) => setOverwrite(c === true)}
                          />
                          <label htmlFor="overwrite" className="text-sm">
                            Sobrescrever configurações existentes
                          </label>
                        </div>
                        <Button
                          onClick={handleApply}
                          disabled={isApplying}
                          className="w-full"
                        >
                          {isApplying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Aplicar ao Agente Atual
                        </Button>
                      </div>
                    )}

                    {(mode === 'create' || mode === 'both') && (
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="agentName">Nome do novo agente</Label>
                          <Input
                            id="agentName"
                            value={newAgentName}
                            onChange={(e) => setNewAgentName(e.target.value)}
                            placeholder="Ex: SDR Vendas Principal"
                          />
                        </div>
                        <Button
                          onClick={handleCreate}
                          disabled={isCreating || !newAgentName.trim()}
                          variant="secondary"
                          className="w-full"
                        >
                          {isCreating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Criar Novo Agente
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              ) : null}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}





