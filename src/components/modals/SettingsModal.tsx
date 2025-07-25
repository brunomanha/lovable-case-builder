import { useState, useEffect } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save, Bot, Key, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type AIProvider = 'openrouter' | 'openai' | 'anthropic' | 'deepseek' | 'groq';

interface AIConfig {
  provider: AIProvider;
  apiKey: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

const AI_PROVIDERS = {
  openrouter: {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    models: {
      free: [
        { id: 'google/gemma-7b-it:free', name: 'Gemma 7B (Gratuito)', description: 'Modelo gratuito do Google' },
        { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini (Gratuito)', description: 'Modelo gratuito da Microsoft' },
        { id: 'mistralai/mistral-7b-instruct:free', name: 'Mistral 7B (Gratuito)', description: 'Modelo gratuito da Mistral' },
        { id: 'huggingfaceh4/zephyr-7b-beta:free', name: 'Zephyr 7B (Gratuito)', description: 'Modelo gratuito da HuggingFace' },
        { id: 'openchat/openchat-7b:free', name: 'OpenChat 7B (Gratuito)', description: 'Modelo gratuito do OpenChat' },
        { id: 'gryphe/mythomist-7b:free', name: 'Mythomist 7B (Gratuito)', description: 'Modelo gratuito especializado' }
      ],
      premium: [
        { id: 'openai/gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Modelo avançado da OpenAI' },
        { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Modelo popular da OpenAI' },
        { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', description: 'Modelo rápido da Anthropic' },
        { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', description: 'Modelo balanceado da Anthropic' },
        { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', description: 'Modelo mais avançado da Anthropic' },
        { id: 'meta-llama/llama-3-70b-instruct', name: 'Llama 3 70B', description: 'Modelo da Meta' },
        { id: 'google/gemini-pro', name: 'Gemini Pro', description: 'Modelo avançado do Google' }
      ]
    }
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4', name: 'GPT-4', description: 'Modelo mais avançado' },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'Versão otimizada' },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Rápido e eficiente' }
    ]
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Mais avançado' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanceado' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Rápido' }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Modelo de chat' },
      { id: 'deepseek-coder', name: 'DeepSeek Coder', description: 'Especializado em código' }
    ]
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.1-405b-reasoning', name: 'Llama 3.1 405B', description: 'Modelo mais avançado' },
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', description: 'Versátil' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Modelo eficiente' }
    ]
  }
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'openrouter',
    apiKey: '',
    model: 'google/gemma-7b-it:free',
    temperature: 0.7,
    maxTokens: 2048
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      // Carregar configurações de IA
      const { data: aiSettings } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('provider', aiConfig.provider)
        .single();

      if (aiSettings) {
        setAiConfig({
          provider: aiSettings.provider as AIProvider,
          apiKey: aiSettings.api_key || '',
          model: aiSettings.model,
          temperature: Number(aiSettings.temperature),
          maxTokens: aiSettings.max_tokens
        });
      }

      // Carregar prompt padrão
      const { data: promptData } = await supabase
        .from('default_prompts')
        .select('prompt_text')
        .eq('user_id', user.id)
        .single();

      if (promptData) {
        setDefaultPrompt(promptData.prompt_text);
      } else {
        setDefaultPrompt(`Você é um assistente especializado em análise de documentos e casos técnicos.

Por favor, analise cuidadosamente o caso apresentado e forneça:

1. **Resumo Executivo**: Síntese clara dos pontos principais
2. **Análise Detalhada**: Exame técnico aprofundado dos documentos
3. **Principais Achados**: Pontos críticos identificados
4. **Recomendações**: Próximos passos sugeridos
5. **Considerações Importantes**: Alertas e observações relevantes

Seja objetivo, profissional e forneça insights valiosos baseados nas informações apresentadas.`);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Validar se API key foi fornecida
      if (!aiConfig.apiKey.trim()) {
        toast({
          title: "API Key obrigatória",
          description: "Por favor, forneça uma API Key válida.",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Salvar configurações de IA
      const { error: aiError } = await supabase
        .from('ai_settings')
        .upsert({
          user_id: user.id,
          provider: aiConfig.provider,
          api_key: aiConfig.apiKey,
          model: aiConfig.model,
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens
        }, {
          onConflict: 'user_id,provider'
        });

      if (aiError) throw aiError;

      // Salvar prompt padrão
      const { error: promptError } = await supabase
        .from('default_prompts')
        .upsert({
          user_id: user.id,
          prompt_text: defaultPrompt.trim()
        }, {
          onConflict: 'user_id'
        });

      if (promptError) throw promptError;
      
      toast({
        title: "Configurações salvas",
        description: "Todas as configurações foram salvas com segurança.",
      });
      
      onClose();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async () => {
    try {
      setIsLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // Deletar configurações existentes
      await supabase
        .from('ai_settings')
        .delete()
        .eq('user_id', user.id);

      await supabase
        .from('default_prompts')
        .delete()
        .eq('user_id', user.id);

      // Resetar para valores padrão
      const defaultPromptText = `Você é um assistente especializado em análise de documentos e casos técnicos.

Por favor, analise cuidadosamente o caso apresentado e forneça:

1. **Resumo Executivo**: Síntese clara dos pontos principais
2. **Análise Detalhada**: Exame técnico aprofundado dos documentos
3. **Principais Achados**: Pontos críticos identificados
4. **Recomendações**: Próximos passos sugeridos
5. **Considerações Importantes**: Alertas e observações relevantes

Seja objetivo, profissional e forneça insights valiosos baseados nas informações apresentadas.`;

      setDefaultPrompt(defaultPromptText);
      setAiConfig({
        provider: 'openrouter',
        apiKey: '',
        model: 'google/gemma-7b-it:free',
        temperature: 0.7,
        maxTokens: 2048
      });
      
      toast({
        title: "Configurações restauradas",
        description: "As configurações padrão foram restauradas.",
      });
    } catch (error) {
      console.error('Erro ao restaurar configurações:', error);
      toast({
        title: "Erro ao restaurar",
        description: "Não foi possível restaurar as configurações.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentModels = () => {
    const provider = AI_PROVIDERS[aiConfig.provider];
    if (aiConfig.provider === 'openrouter') {
      const openrouterProvider = provider as typeof AI_PROVIDERS.openrouter;
      return [...openrouterProvider.models.free, ...openrouterProvider.models.premium];
    }
    return provider.models as Array<{ id: string; name: string; description: string; }>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Sistema
          </DialogTitle>
          <DialogDescription>
            Configure serviços de IA e comportamento padrão para análise de casos
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="ai-services" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai-services" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Serviços de IA
            </TabsTrigger>
            <TabsTrigger value="prompt" className="flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Prompt Padrão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ai-services" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Configuração do Provedor de IA
                </CardTitle>
                <CardDescription>
                  Selecione e configure seu provedor de IA preferido
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provedor de IA</Label>
                    <Select
                      value={aiConfig.provider}
                      onValueChange={(value: AIProvider) => {
                        const newProvider = value;
                        let defaultModel = '';
                        
                        if (newProvider === 'openrouter') {
                          defaultModel = 'google/gemma-7b-it:free';
                        } else {
                          defaultModel = AI_PROVIDERS[newProvider].models[0].id;
                        }
                        
                        setAiConfig({
                          ...aiConfig,
                          provider: newProvider,
                          model: defaultModel
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o provedor" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                          <SelectItem key={key} value={key}>
                            {provider.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Modelo</Label>
                    <Select
                      value={aiConfig.model}
                      onValueChange={(value) => setAiConfig({ ...aiConfig, model: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o modelo" />
                      </SelectTrigger>
                      <SelectContent>
                        {aiConfig.provider === 'openrouter' && (
                          <>
                            <div className="px-2 py-1 text-sm font-semibold text-green-600">
                              🆓 Modelos Gratuitos
                            </div>
                            {AI_PROVIDERS.openrouter.models.free.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex flex-col">
                                  <span>{model.name}</span>
                                  <span className="text-xs text-muted-foreground">{model.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                            <div className="px-2 py-1 text-sm font-semibold text-blue-600">
                              💰 Modelos Premium
                            </div>
                            {AI_PROVIDERS.openrouter.models.premium.map((model) => (
                              <SelectItem key={model.id} value={model.id}>
                                <div className="flex flex-col">
                                  <span>{model.name}</span>
                                  <span className="text-xs text-muted-foreground">{model.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {aiConfig.provider !== 'openrouter' && 
                          getCurrentModels().map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              <div className="flex flex-col">
                                <span>{model.name}</span>
                                <span className="text-xs text-muted-foreground">{model.description}</span>
                              </div>
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                    placeholder="Cole sua API key aqui..."
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    {aiConfig.provider === 'openrouter' && 'Obtenha sua API key em: https://openrouter.ai/keys'}
                    {aiConfig.provider === 'openai' && 'Obtenha sua API key em: https://platform.openai.com/api-keys'}
                    {aiConfig.provider === 'anthropic' && 'Obtenha sua API key em: https://console.anthropic.com/'}
                    {aiConfig.provider === 'deepseek' && 'Obtenha sua API key em: https://platform.deepseek.com/'}
                    {aiConfig.provider === 'groq' && 'Obtenha sua API key em: https://console.groq.com/keys'}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">
                      Temperatura: {aiConfig.temperature}
                    </Label>
                    <input
                      type="range"
                      id="temperature"
                      min="0"
                      max="1"
                      step="0.1"
                      value={aiConfig.temperature}
                      onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Controla a criatividade (0 = mais preciso, 1 = mais criativo)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Máximo de Tokens</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      min="256"
                      max="8192"
                      value={aiConfig.maxTokens}
                      onChange={(e) => setAiConfig({ ...aiConfig, maxTokens: parseInt(e.target.value) })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Limite de tokens para a resposta (256 - 8192)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="prompt" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Prompt Padrão da IA</CardTitle>
                <CardDescription>
                  Este prompt será usado automaticamente em todas as análises de casos. 
                  Personalize para adequar ao seu tipo de trabalho específico.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  id="defaultPrompt"
                  value={defaultPrompt}
                  onChange={(e) => setDefaultPrompt(e.target.value)}
                  className="min-h-[400px] resize-none"
                  placeholder="Digite o prompt padrão que a IA deve usar..."
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Caracteres: {defaultPrompt.length}
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={handleReset}
            disabled={isLoading}
          >
            Restaurar Padrão
          </Button>
          <div className="flex-1" />
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isLoading || defaultPrompt.trim().length === 0}
            className="bg-gradient-to-r from-primary to-primary-hover"
          >
            <Save className="mr-2 h-4 w-4" />
            Salvar Configurações
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}