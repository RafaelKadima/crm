import { useState } from 'react';
import { 
  Wand2, 
  Target, 
  Users, 
  DollarSign,
  Clock,
  Link,
  Image,
  MessageSquare,
  Sparkles,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  Loader2,
  Copy,
  ArrowRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Spinner } from '@/components/ui/Spinner';
import { useAdAccounts } from '@/hooks/useAds';
import api from '@/api/axios';
import { toast } from 'sonner';

interface CopyVariation {
  variation_name: string;
  primary_text: string;
  headline: string;
  description: string;
  call_to_action: string;
  hook_type: string;
  estimated_effectiveness: number;
}

interface CampaignResult {
  success: boolean;
  message: string;
  campaign?: any;
  strategy?: any;
  copies_generated?: number;
  targeting?: any;
}

export default function AdsAgent() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedCopies, setGeneratedCopies] = useState<CopyVariation[]>([]);
  const [campaignResult, setCampaignResult] = useState<CampaignResult | null>(null);
  
  const { data: accounts } = useAdAccounts();
  
  // Form state
  const [formData, setFormData] = useState({
    ad_account_id: '',
    platform: 'meta',
    product_name: '',
    product_description: '',
    target_audience: '',
    objective: 'conversions',
    daily_budget: 50,
    duration_days: 7,
    landing_page_url: '',
    creative_urls: [''],
    tone_of_voice: 'profissional',
    key_benefits: ['', '', ''],
    call_to_action: 'Saiba Mais',
  });

  const objectives = [
    { value: 'conversions', label: 'Conversões', icon: Target, description: 'Maximize vendas e leads' },
    { value: 'traffic', label: 'Tráfego', icon: Users, description: 'Leve visitantes ao site' },
    { value: 'awareness', label: 'Reconhecimento', icon: Sparkles, description: 'Aumente a visibilidade' },
    { value: 'leads', label: 'Leads', icon: MessageSquare, description: 'Capture contatos' },
  ];

  const tones = [
    { value: 'profissional', label: 'Profissional', emoji: '💼' },
    { value: 'casual', label: 'Casual', emoji: '😊' },
    { value: 'urgente', label: 'Urgente', emoji: '⚡' },
    { value: 'inspirador', label: 'Inspirador', emoji: '✨' },
  ];

  const ctas = [
    'Saiba Mais', 'Compre Agora', 'Cadastre-se', 'Entre em Contato', 
    'Baixar', 'Obter Oferta', 'Reserve Agora', 'Assinar'
  ];

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const updateBenefit = (index: number, value: string) => {
    const newBenefits = [...formData.key_benefits];
    newBenefits[index] = value;
    updateFormData('key_benefits', newBenefits);
  };

  const generateCopiesOnly = async () => {
    setIsLoading(true);
    
    try {
      const response = await api.post('/ai/ads/agent/generate-copy', {
        product_name: formData.product_name,
        product_description: formData.product_description,
        target_audience: formData.target_audience,
        tone_of_voice: formData.tone_of_voice,
        key_benefits: formData.key_benefits.filter(b => b.trim()),
        num_variations: 5,
      });
      
      setGeneratedCopies(response.data.copies || []);
      toast.success(`${response.data.count} copies gerados com sucesso!`);
      setStep(3);
      
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao gerar copies');
    } finally {
      setIsLoading(false);
    }
  };

  const createCampaign = async () => {
    if (!formData.ad_account_id) {
      toast.error('Selecione uma conta de anúncio');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await api.post('/ai/ads/agent/create-campaign', {
        tenant_id: '', // Será pego do contexto
        ad_account_id: formData.ad_account_id,
        briefing: {
          product_name: formData.product_name,
          product_description: formData.product_description,
          target_audience: formData.target_audience,
          objective: formData.objective,
          daily_budget: formData.daily_budget,
          duration_days: formData.duration_days,
          landing_page_url: formData.landing_page_url,
          creative_urls: formData.creative_urls.filter(u => u.trim()),
          tone_of_voice: formData.tone_of_voice,
          key_benefits: formData.key_benefits.filter(b => b.trim()),
          call_to_action: formData.call_to_action,
        },
        platform: formData.platform,
        auto_publish: false, // Sempre cria pausada
      });
      
      setCampaignResult(response.data);
      toast.success('Campanha criada com sucesso!');
      setStep(4);
      
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erro ao criar campanha');
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Wand2 className="w-7 h-7 text-purple-500" />
            Agente de Campanhas
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Crie campanhas completas com IA em poucos minutos
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`
              w-10 h-10 rounded-full flex items-center justify-center font-semibold
              ${step >= s 
                ? 'bg-purple-500 text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-500'}
            `}>
              {step > s ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            {s < 4 && (
              <div className={`w-12 h-1 mx-2 ${step > s ? 'bg-purple-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Produto e Público */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>📦 Sobre o Produto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Nome do Produto/Serviço *</Label>
                <Input
                  placeholder="Ex: Curso de Marketing Digital"
                  value={formData.product_name}
                  onChange={(e) => updateFormData('product_name', e.target.value)}
                />
              </div>
              
              <div className="space-y-2">
                <Label>URL da Landing Page *</Label>
                <Input
                  placeholder="https://seusite.com/oferta"
                  value={formData.landing_page_url}
                  onChange={(e) => updateFormData('landing_page_url', e.target.value)}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Descrição do Produto *</Label>
              <textarea
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[100px]"
                placeholder="Descreva seu produto/serviço em detalhes. O que é? Qual problema resolve? Quais os diferenciais?"
                value={formData.product_description}
                onChange={(e) => updateFormData('product_description', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Público-Alvo *</Label>
              <textarea
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 min-h-[80px]"
                placeholder="Descreva quem é seu cliente ideal. Ex: Empreendedores de 25-45 anos que querem aumentar vendas online..."
                value={formData.target_audience}
                onChange={(e) => updateFormData('target_audience', e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Principais Benefícios</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {formData.key_benefits.map((benefit, i) => (
                  <Input
                    key={i}
                    placeholder={`Benefício ${i + 1}`}
                    value={benefit}
                    onChange={(e) => updateBenefit(i, e.target.value)}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex justify-end">
              <Button 
                onClick={() => setStep(2)}
                disabled={!formData.product_name || !formData.product_description || !formData.target_audience}
              >
                Próximo <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Configurações da Campanha */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>⚙️ Configurações da Campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Conta de Anúncio *</Label>
                <select
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                  value={formData.ad_account_id}
                  onChange={(e) => updateFormData('ad_account_id', e.target.value)}
                >
                  <option value="">Selecione uma conta</option>
                  {accounts?.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({account.platform})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="space-y-2">
                <Label>Plataforma</Label>
                <div className="flex gap-3">
                  <Button
                    variant={formData.platform === 'meta' ? 'default' : 'outline'}
                    onClick={() => updateFormData('platform', 'meta')}
                    className="flex-1"
                  >
                    📘 Meta (Facebook/Instagram)
                  </Button>
                  <Button
                    variant={formData.platform === 'google' ? 'default' : 'outline'}
                    onClick={() => updateFormData('platform', 'google')}
                    className="flex-1"
                  >
                    🔍 Google Ads
                  </Button>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Objetivo da Campanha</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {objectives.map((obj) => (
                  <button
                    key={obj.value}
                    onClick={() => updateFormData('objective', obj.value)}
                    className={`p-4 rounded-lg border-2 text-left transition-all ${
                      formData.objective === obj.value
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <obj.icon className={`w-6 h-6 mb-2 ${
                      formData.objective === obj.value ? 'text-purple-500' : 'text-gray-400'
                    }`} />
                    <p className="font-medium">{obj.label}</p>
                    <p className="text-xs text-gray-500">{obj.description}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Orçamento Diário (R$)</Label>
                <Input
                  type="number"
                  min="10"
                  value={formData.daily_budget}
                  onChange={(e) => updateFormData('daily_budget', Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Duração (dias)</Label>
                <Input
                  type="number"
                  min="1"
                  max="90"
                  value={formData.duration_days}
                  onChange={(e) => updateFormData('duration_days', Number(e.target.value))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Investimento Total</Label>
                <div className="p-3 bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p className="text-2xl font-bold text-purple-600">
                    R$ {(formData.daily_budget * formData.duration_days).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Tom de Voz</Label>
              <div className="flex flex-wrap gap-3">
                {tones.map((tone) => (
                  <button
                    key={tone.value}
                    onClick={() => updateFormData('tone_of_voice', tone.value)}
                    className={`px-4 py-2 rounded-full border-2 transition-all ${
                      formData.tone_of_voice === tone.value
                        ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    {tone.emoji} {tone.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-2">
              <Label>Call to Action</Label>
              <div className="flex flex-wrap gap-2">
                {ctas.map((cta) => (
                  <button
                    key={cta}
                    onClick={() => updateFormData('call_to_action', cta)}
                    className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                      formData.call_to_action === cta
                        ? 'bg-purple-500 text-white'
                        : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200'
                    }`}
                  >
                    {cta}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={generateCopiesOnly} disabled={isLoading}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Gerar Apenas Copies
                </Button>
                <Button onClick={createCampaign} disabled={isLoading || !formData.ad_account_id}>
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  Criar Campanha Completa
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Copies Gerados */}
      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle>✨ Copies Gerados pela IA</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {generatedCopies.map((copy, index) => (
              <div 
                key={index}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">{copy.variation_name}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {copy.hook_type}
                    </span>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                      {copy.estimated_effectiveness}% efetividade
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Headline</p>
                      <p className="font-medium">{copy.headline}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(copy.headline)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Texto Principal</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{copy.primary_text}</p>
                    </div>
                    <Button size="sm" variant="ghost" onClick={() => copyToClipboard(copy.primary_text)}>
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">Descrição: {copy.description}</span>
                    <span className="text-purple-600">CTA: {copy.call_to_action}</span>
                  </div>
                </div>
              </div>
            ))}
            
            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button onClick={createCampaign} disabled={isLoading || !formData.ad_account_id}>
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Criar Campanha com estes Copies
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Resultado */}
      {step === 4 && campaignResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              Campanha Criada com Sucesso!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-green-700 dark:text-green-400">{campaignResult.message}</p>
            </div>
            
            {campaignResult.strategy && (
              <div className="space-y-3">
                <h3 className="font-semibold">📊 Estratégia Gerada</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500">Objetivo</p>
                    <p className="font-medium">{campaignResult.strategy.campaign_objective}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500">Otimização</p>
                    <p className="font-medium">{campaignResult.strategy.optimization_goal}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500">Copies Gerados</p>
                    <p className="font-medium">{campaignResult.copies_generated}</p>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="font-medium text-yellow-600">Pausada</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-700 dark:text-yellow-400">Próximos Passos</p>
                <ul className="text-sm text-yellow-600 dark:text-yellow-500 mt-1 space-y-1">
                  <li>1. Revise os anúncios na plataforma</li>
                  <li>2. Adicione os criativos (imagens/vídeos)</li>
                  <li>3. Ajuste a segmentação se necessário</li>
                  <li>4. Ative a campanha quando estiver pronto</li>
                </ul>
              </div>
            </div>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => {
                setStep(1);
                setCampaignResult(null);
                setGeneratedCopies([]);
              }}>
                Criar Nova Campanha
              </Button>
              <Button onClick={() => window.location.href = '/ads/campaigns'}>
                Ver Campanhas <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

