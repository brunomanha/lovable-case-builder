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
import { Settings, Save, Bot, Key, Zap, TestTube, CheckCircle, XCircle, Loader2, Search } from "lucide-react";
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
        { id: 'deepseek/deepseek-r1-distill-qwen-32b', name: 'DeepSeek: Deepseek R1 0528 Qwen3 8B (free)', description: 'Modelo de raciocínio gratuito', icon: '🧠' },
        { id: 'qwen/qwen-2.5-coder-32b-instruct:free', name: 'Qwen: Qwen3 Coder (free)', description: 'Especializado em código gratuito', icon: '🔮' },
        { id: 'qwen/qwq-32b-preview:free', name: 'Qwen: Qwen3 235B A22B Instruct 2507 (free)', description: 'Modelo de raciocínio gratuito', icon: '🔮' },
        { id: 'google/gemini-2.0-flash-exp:free', name: 'Google: Gemini 2.5 Flash Lite', description: 'Modelo rápido do Google', icon: '💎' },
        { id: 'google/gemma-7b-it:free', name: 'Gemma 7B (Gratuito)', description: 'Modelo gratuito do Google', icon: '🤖' },
        { id: 'microsoft/phi-3-mini-128k-instruct:free', name: 'Phi-3 Mini (Gratuito)', description: 'Modelo gratuito da Microsoft', icon: '🤖' }
      ],
      premium: [
        { id: 'qwen/qwq-32b-preview', name: 'Qwen: Qwen3 235B A22B Thinking 2507', description: 'Modelo de raciocínio avançado', icon: '🔮' },
        { id: 'qwen/qwen-2.5-coder-32b-instruct', name: 'Qwen: Qwen3 Coder', description: 'Especializado em código', icon: '🔮' },
        { id: 'qwen/qwen-2.5-72b-instruct', name: 'Qwen: Qwen3 235B A22B Instruct 2507', description: 'Modelo de instrução avançado', icon: '🔮' },
        { id: 'bytedance/ui-tars-7b', name: 'Bytedance: UI-TARS 7B', description: 'Especializado em interfaces', icon: '😊' },
        { id: 'openai/gpt-4o', name: 'GPT-4 Turbo', description: 'Modelo avançado da OpenAI', icon: '⚡' },
        { id: 'anthropic/claude-3.5-sonnet', name: 'Claude 3.5 Sonnet', description: 'Modelo balanceado da Anthropic', icon: '🎭' },
        { id: 'meta-llama/llama-3.1-405b-instruct', name: 'Llama 3.1 405B', description: 'Modelo da Meta', icon: '🦙' },
        { id: 'deepseek/deepseek-r1-distill-qwen-32b', name: 'DeepSeek R1 Distill', description: 'Modelo de raciocínio profundo', icon: '🧠' }
      ]
    }
  },
  openai: {
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    models: [
      { id: 'gpt-4.1-2025-04-14', name: 'GPT-4.1', description: 'Modelo flagship mais recente', icon: '⚡' },
      { id: 'o3-2025-04-16', name: 'O3', description: 'Modelo de raciocínio poderoso', icon: '🧠' },
      { id: 'o4-mini-2025-04-16', name: 'O4 Mini', description: 'Raciocínio rápido e eficiente', icon: '🚀' },
      { id: 'gpt-4o', name: 'GPT-4o', description: 'Modelo com visão', icon: '👁️' }
    ]
  },
  anthropic: {
    name: 'Anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    models: [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', description: 'Mais capaz e inteligente', icon: '🎭' },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Alto desempenho e eficiência', icon: '🎭' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Modelo mais rápido', icon: '🎭' }
    ]
  },
  deepseek: {
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com/v1',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', description: 'Modelo de conversação geral', icon: '💬' },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', description: 'Modelo de raciocínio avançado', icon: '🧠' }
    ]
  },
  groq: {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    models: [
      { id: 'llama-3.1-405b-reasoning', name: 'Llama 3.1 405B', description: 'Modelo mais avançado', icon: '🦙' },
      { id: 'llama-3.1-70b-versatile', name: 'Llama 3.1 70B', description: 'Versátil', icon: '🦙' },
      { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B', description: 'Modelo eficiente', icon: '🌊' }
    ]
  }
};

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'deepseek',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2048
  });
  const [isLoading, setIsLoading] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState("");
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

  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);

  const handleSave = async () => {
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

      // Verificar se já existe configuração para este provedor
      const { data: existingSettings } = await supabase
        .from('ai_settings')
        .select('id')
        .eq('user_id', user.id)
        .eq('provider', aiConfig.provider)
        .single();

      let aiError;
      if (existingSettings) {
        // Atualizar configuração existente
        const { error } = await supabase
          .from('ai_settings')
          .update({
            api_key: aiConfig.apiKey,
            model: aiConfig.model,
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.maxTokens
          })
          .eq('user_id', user.id)
          .eq('provider', aiConfig.provider);
        aiError = error;
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('ai_settings')
          .insert({
            user_id: user.id,
            provider: aiConfig.provider,
            api_key: aiConfig.apiKey,
            model: aiConfig.model,
            temperature: aiConfig.temperature,
            max_tokens: aiConfig.maxTokens
          });
        aiError = error;
      }

      if (aiError) throw aiError;

      // Verificar se já existe prompt padrão
      const { data: existingPrompt } = await supabase
        .from('default_prompts')
        .select('id')
        .eq('user_id', user.id)
        .single();

      let promptError;
      if (existingPrompt) {
        // Atualizar prompt existente
        const { error } = await supabase
          .from('default_prompts')
          .update({
            prompt_text: defaultPrompt.trim()
          })
          .eq('user_id', user.id);
        promptError = error;
      } else {
        // Criar novo prompt
        const { error } = await supabase
          .from('default_prompts')
          .insert({
            user_id: user.id,
            prompt_text: defaultPrompt.trim()
          });
        promptError = error;
      }

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

  const handleTestConnection = async () => {
    if (!aiConfig.apiKey.trim()) {
      toast({
        title: "API Key obrigatória",
        description: "Por favor, forneça uma API Key válida antes de testar.",
        variant: "destructive",
      });
      return;
    }

    setTestingConnection(true);
    setTestResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await supabase.functions.invoke('test-ai-connection', {
        body: {
          provider: aiConfig.provider,
          apiKey: aiConfig.apiKey,
          model: aiConfig.model
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      setTestResult(response.data);
      
      if (response.data.success) {
        toast({
          title: "Conexão bem-sucedida! ✅",
          description: `${response.data.message} (${response.data.responseTime}ms)`,
        });
      } else {
        toast({
          title: "Falha na conexão ❌",
          description: response.data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Erro no teste de conexão:", error);
      const errorResult = {
        success: false,
        message: `Erro no teste: ${error.message}`,
        details: { error: error.message }
      };
      setTestResult(errorResult);
      
      toast({
        title: "Erro no teste de conexão",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setTestingConnection(false);
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
        provider: 'deepseek',
        apiKey: '',
        model: 'deepseek-chat',
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
      const allModels = [...openrouterProvider.models.free, ...openrouterProvider.models.premium];
      
      if (modelSearchTerm.trim() === "") return allModels;
      
      return allModels.filter(model => 
        model.name.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
        model.description.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
        model.id.toLowerCase().includes(modelSearchTerm.toLowerCase())
      );
    }
    
    const allModels = provider.models as Array<{ id: string; name: string; description: string; icon?: string; }>;
    
    if (modelSearchTerm.trim() === "") return allModels;
    
    return allModels.filter(model => 
      model.name.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
      model.description.toLowerCase().includes(modelSearchTerm.toLowerCase()) ||
      model.id.toLowerCase().includes(modelSearchTerm.toLowerCase())
    );
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
                          defaultModel = 'deepseek/deepseek-r1-distill-qwen-32b';
                        } else if (newProvider === 'deepseek') {
                          defaultModel = 'deepseek-chat';
                        } else {
                          defaultModel = AI_PROVIDERS[newProvider].models[0].id;
                        }
                        
                        setAiConfig({
                          ...aiConfig,
                          provider: newProvider,
                          model: defaultModel
                        });
                        setModelSearchTerm(""); // Reset search when changing provider
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

                  <div className="space-y-3">
                    <Label htmlFor="model">Modelo</Label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Input
                          placeholder="Pesquisar modelos..."
                          value={modelSearchTerm}
                          onChange={(e) => setModelSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      <div className="border rounded-lg max-h-64 overflow-y-auto bg-background">
                        {getCurrentModels().length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            Nenhum modelo encontrado
                          </div>
                        ) : (
                          <div className="space-y-1 p-2">
                            {aiConfig.provider === 'openrouter' && modelSearchTerm.trim() === "" && (
                              <>
                                <div className="px-2 py-1 text-sm font-semibold text-green-600 bg-green-50 rounded">
                                  🆓 Modelos Gratuitos
                                </div>
                                {AI_PROVIDERS.openrouter.models.free.map((model) => (
                                  <div
                                    key={model.id}
                                    onClick={() => {
                                      setAiConfig({ ...aiConfig, model: model.id });
                                      setModelSearchTerm("");
                                    }}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                      aiConfig.model === model.id 
                                        ? 'bg-primary/10 border-primary' 
                                        : 'hover:bg-muted border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{model.icon}</span>
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{model.name}</div>
                                        <div className="text-xs text-muted-foreground">{model.description}</div>
                                      </div>
                                      {aiConfig.model === model.id && (
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                                <div className="px-2 py-1 text-sm font-semibold text-blue-600 bg-blue-50 rounded mt-3">
                                  💎 Modelos Premium
                                </div>
                                {AI_PROVIDERS.openrouter.models.premium.map((model) => (
                                  <div
                                    key={model.id}
                                    onClick={() => {
                                      setAiConfig({ ...aiConfig, model: model.id });
                                      setModelSearchTerm("");
                                    }}
                                    className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                      aiConfig.model === model.id 
                                        ? 'bg-primary/10 border-primary' 
                                        : 'hover:bg-muted border-transparent'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className="text-lg">{model.icon}</span>
                                      <div className="flex-1">
                                        <div className="font-medium text-sm">{model.name}</div>
                                        <div className="text-xs text-muted-foreground">{model.description}</div>
                                      </div>
                                      {aiConfig.model === model.id && (
                                        <CheckCircle className="h-4 w-4 text-primary" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                            
                            {(aiConfig.provider !== 'openrouter' || modelSearchTerm.trim() !== "") &&
                              getCurrentModels().map((model) => (
                                <div
                                  key={model.id}
                                  onClick={() => {
                                    setAiConfig({ ...aiConfig, model: model.id });
                                    setModelSearchTerm("");
                                  }}
                                  className={`p-3 rounded-lg cursor-pointer transition-colors border ${
                                    aiConfig.model === model.id 
                                      ? 'bg-primary/10 border-primary' 
                                      : 'hover:bg-muted border-transparent'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">{model.icon || '🤖'}</span>
                                    <div className="flex-1">
                                      <div className="font-medium text-sm">{model.name}</div>
                                      <div className="text-xs text-muted-foreground">{model.description}</div>
                                    </div>
                                    {aiConfig.model === model.id && (
                                      <CheckCircle className="h-4 w-4 text-primary" />
                                    )}
                                  </div>
                                </div>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    </div>
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

                {/* Botão de Teste de Conexão */}
                <div className="space-y-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTestConnection}
                    disabled={testingConnection || !aiConfig.apiKey.trim()}
                    className="w-full"
                  >
                    {testingConnection ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testando conexão...
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Testar Conexão com IA
                      </>
                    )}
                  </Button>
                  
                  {testResult && (
                    <div className={`p-3 rounded-lg border ${
                      testResult.success 
                        ? 'bg-success/10 border-success/20 text-success-foreground' 
                        : 'bg-destructive/10 border-destructive/20 text-destructive-foreground'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        {testResult.success ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="font-medium">
                          {testResult.success ? 'Conexão bem-sucedida!' : 'Falha na conexão'}
                        </span>
                      </div>
                      <p className="text-sm">{testResult.message}</p>
                      {testResult.details && (
                        <details className="mt-2">
                          <summary className="text-xs cursor-pointer">Ver detalhes</summary>
                          <pre className="text-xs mt-1 bg-background/50 p-2 rounded border overflow-auto">
                            {JSON.stringify(testResult.details, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  )}
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