import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { Settings, Save, Bot, Key, Zap, TestTube, CheckCircle, XCircle, Loader2, Search, Lock, Mail } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role?: string;
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

interface UserConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

const UserConfigurationModal = ({ isOpen, onClose, user }: UserConfigurationModalProps) => {
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [aiConfig, setAiConfig] = useState<AIConfig>({
    provider: 'deepseek',
    apiKey: '',
    model: 'deepseek-chat',
    temperature: 0.7,
    maxTokens: 2048
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [modelSearchTerm, setModelSearchTerm] = useState("");
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; details?: any } | null>(null);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetingPassword, setResetingPassword] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && user) {
      loadUserConfiguration();
    }
  }, [isOpen, user]);

  const loadUserConfiguration = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Carregar configurações de IA
      const { data: aiData } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('user_id', user.user_id)
        .maybeSingle();

      if (aiData) {
        setAiConfig({
          provider: aiData.provider as AIProvider,
          apiKey: aiData.api_key || '',
          model: aiData.model,
          temperature: Number(aiData.temperature),
          maxTokens: aiData.max_tokens
        });
      } else {
        // Configurações padrão
        setAiConfig({
          provider: 'deepseek',
          apiKey: '',
          model: 'deepseek-chat',
          temperature: 0.7,
          maxTokens: 2048
        });
      }

      // Carregar prompt padrão
      const { data: promptData } = await supabase
        .from('default_prompts')
        .select('*')
        .eq('user_id', user.user_id)
        .maybeSingle();

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
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      // Verificar se já existe configuração para este usuário
      const { data: existingSettings } = await supabase
        .from('ai_settings')
        .select('id')
        .eq('user_id', user.user_id)
        .eq('provider', aiConfig.provider)
        .maybeSingle();

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
          .eq('user_id', user.user_id)
          .eq('provider', aiConfig.provider);
        aiError = error;
      } else {
        // Criar nova configuração
        const { error } = await supabase
          .from('ai_settings')
          .insert({
            user_id: user.user_id,
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
        .eq('user_id', user.user_id)
        .maybeSingle();

      let promptError;
      if (existingPrompt) {
        // Atualizar prompt existente
        const { error } = await supabase
          .from('default_prompts')
          .update({
            prompt_text: defaultPrompt.trim()
          })
          .eq('user_id', user.user_id);
        promptError = error;
      } else {
        // Criar novo prompt
        const { error } = await supabase
          .from('default_prompts')
          .insert({
            user_id: user.user_id,
            prompt_text: defaultPrompt.trim()
          });
        promptError = error;
      }

      if (promptError) throw promptError;

      toast({
        title: "Sucesso",
        description: "Configurações salvas com sucesso.",
      });

      onClose();
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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

  const handleSendPasswordReset = async () => {
    if (!user?.email) {
      toast({
        title: "Erro",
        description: "Email do usuário não encontrado.",
        variant: "destructive",
      });
      return;
    }

    setResetingPassword(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) {
        toast({
          title: "Erro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Email enviado!",
          description: `Link de redefinição de senha enviado para ${user.email}.`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setResetingPassword(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Usuário
          </DialogTitle>
          <DialogDescription>
            Gerencie as configurações de IA e prompts para {user.display_name || user.email}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <Tabs defaultValue="ai-services" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="ai-services" className="flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Serviços de IA
              </TabsTrigger>
              <TabsTrigger value="prompt" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Prompt Padrão
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Segurança
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
                    Configure o provedor de IA para este usuário
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
                          setModelSearchTerm("");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
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
                      <Label htmlFor="api-key">API Key</Label>
                      <Input
                        id="api-key"
                        type="password"
                        placeholder="Insira sua API key"
                        value={aiConfig.apiKey}
                        onChange={(e) => setAiConfig({ ...aiConfig, apiKey: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="model">Modelo</Label>
                      <div className="flex items-center gap-2">
                        <Search className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar modelos..."
                          value={modelSearchTerm}
                          onChange={(e) => setModelSearchTerm(e.target.value)}
                          className="w-48"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                      {getCurrentModels().map((model) => (
                        <div
                          key={model.id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            aiConfig.model === model.id
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted/50'
                          }`}
                          onClick={() => setAiConfig({ ...aiConfig, model: model.id })}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{model.icon}</span>
                                <h4 className="font-medium text-sm">{model.name}</h4>
                              </div>
                              <p className="text-xs text-muted-foreground mt-1">
                                {model.description}
                              </p>
                              <p className="text-xs font-mono text-muted-foreground mt-1">
                                {model.id}
                              </p>
                            </div>
                            {aiConfig.model === model.id && (
                              <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="temperature">
                        Temperatura: {aiConfig.temperature}
                      </Label>
                      <Input
                        id="temperature"
                        type="range"
                        min="0"
                        max="2"
                        step="0.1"
                        value={aiConfig.temperature}
                        onChange={(e) => setAiConfig({ ...aiConfig, temperature: parseFloat(e.target.value) })}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Mais focado</span>
                        <span>Mais criativo</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max-tokens">Máximo de Tokens</Label>
                      <Input
                        id="max-tokens"
                        type="number"
                        min="100"
                        max="8000"
                        value={aiConfig.maxTokens}
                        onChange={(e) => setAiConfig({ ...aiConfig, maxTokens: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleTestConnection}
                      disabled={testingConnection || !aiConfig.apiKey.trim()}
                      className="flex items-center gap-2"
                    >
                      {testingConnection ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <TestTube className="h-4 w-4" />
                      )}
                      Testar Conexão
                    </Button>

                    {testResult && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm ${
                        testResult.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {testResult.success ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        {testResult.message}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prompt" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Prompt Padrão do Sistema
                  </CardTitle>
                  <CardDescription>
                    Configure o comportamento padrão da IA para análise de casos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="default-prompt">Prompt do Sistema</Label>
                    <Textarea
                      id="default-prompt"
                      placeholder="Digite o prompt padrão que será usado para análise de casos..."
                      value={defaultPrompt}
                      onChange={(e) => setDefaultPrompt(e.target.value)}
                      rows={12}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Este prompt será usado como base para todas as análises de casos. 
                      Seja específico sobre o formato de resposta desejado.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Configurações de Segurança
                  </CardTitle>
                  <CardDescription>
                    Gerencie configurações de segurança para {user.display_name || user.email}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-4 p-4 border rounded-lg">
                      <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium">Redefinir Senha</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                          Enviar um link de redefinição de senha para o email do usuário.
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          <strong>Email:</strong> {user.email}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={handleSendPasswordReset}
                        disabled={resetingPassword}
                      >
                        {resetingPassword ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Enviando...
                          </>
                        ) : (
                          <>
                            <Mail className="mr-2 h-4 w-4" />
                            Enviar Link
                          </>
                        )}
                      </Button>
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start gap-2">
                        <div className="text-yellow-600">⚠️</div>
                        <div className="text-sm text-yellow-800">
                          <strong>Importante:</strong> O usuário receberá um email com um link para redefinir a senha. 
                          Este link é válido por um tempo limitado e pode ser usado apenas uma vez.
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserConfigurationModal;