import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  role?: string;
}

interface AISettings {
  id?: string;
  user_id: string;
  provider: string;
  model: string;
  api_key: string | null;
  temperature: number;
  max_tokens: number;
}

interface DefaultPrompt {
  id?: string;
  user_id: string;
  prompt_text: string;
}

interface UserConfigurationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
}

const UserConfigurationModal = ({ isOpen, onClose, user }: UserConfigurationModalProps) => {
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [defaultPrompt, setDefaultPrompt] = useState<DefaultPrompt | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
        .single();

      if (aiData) {
        setAiSettings(aiData);
      } else {
        // Configurações padrão
        setAiSettings({
          user_id: user.user_id,
          provider: 'openrouter',
          model: 'qwen/qwq-32b-preview',
          api_key: null,
          temperature: 0.7,
          max_tokens: 1000
        });
      }

      // Carregar prompt padrão
      const { data: promptData } = await supabase
        .from('default_prompts')
        .select('*')
        .eq('user_id', user.user_id)
        .single();

      if (promptData) {
        setDefaultPrompt(promptData);
      } else {
        setDefaultPrompt({
          user_id: user.user_id,
          prompt_text: 'Você é um assistente jurídico especializado em direito brasileiro. Responda de forma clara e objetiva.'
        });
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user || !aiSettings || !defaultPrompt) return;

    setSaving(true);
    try {
      // Salvar configurações de IA
      if (aiSettings.id) {
        const { error: aiError } = await supabase
          .from('ai_settings')
          .update({
            provider: aiSettings.provider,
            model: aiSettings.model,
            api_key: aiSettings.api_key,
            temperature: aiSettings.temperature,
            max_tokens: aiSettings.max_tokens
          })
          .eq('id', aiSettings.id);

        if (aiError) throw aiError;
      } else {
        const { error: aiError } = await supabase
          .from('ai_settings')
          .insert(aiSettings);

        if (aiError) throw aiError;
      }

      // Salvar prompt padrão
      if (defaultPrompt.id) {
        const { error: promptError } = await supabase
          .from('default_prompts')
          .update({
            prompt_text: defaultPrompt.prompt_text
          })
          .eq('id', defaultPrompt.id);

        if (promptError) throw promptError;
      } else {
        const { error: promptError } = await supabase
          .from('default_prompts')
          .insert(defaultPrompt);

        if (promptError) throw promptError;
      }

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

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
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
          <div className="space-y-6">
            {/* Configurações de IA */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Configurações de IA</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Provedor</Label>
                  <Select
                    value={aiSettings?.provider || 'openrouter'}
                    onValueChange={(value) => setAiSettings(prev => prev ? {...prev, provider: value} : null)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="openrouter">OpenRouter</SelectItem>
                      <SelectItem value="openai">OpenAI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Modelo</Label>
                  <Input
                    id="model"
                    value={aiSettings?.model || ''}
                    onChange={(e) => setAiSettings(prev => prev ? {...prev, model: e.target.value} : null)}
                    placeholder="qwen/qwq-32b-preview"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="api_key">Chave da API</Label>
                <Input
                  id="api_key"
                  type="password"
                  value={aiSettings?.api_key || ''}
                  onChange={(e) => setAiSettings(prev => prev ? {...prev, api_key: e.target.value} : null)}
                  placeholder="Deixe em branco para usar a chave do sistema"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperatura</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={aiSettings?.temperature || 0.7}
                    onChange={(e) => setAiSettings(prev => prev ? {...prev, temperature: parseFloat(e.target.value)} : null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max_tokens">Máximo de Tokens</Label>
                  <Input
                    id="max_tokens"
                    type="number"
                    min="100"
                    max="4000"
                    value={aiSettings?.max_tokens || 1000}
                    onChange={(e) => setAiSettings(prev => prev ? {...prev, max_tokens: parseInt(e.target.value)} : null)}
                  />
                </div>
              </div>
            </div>

            {/* Prompt Padrão */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Prompt Padrão</h3>
              <div className="space-y-2">
                <Label htmlFor="prompt_text">Texto do Prompt</Label>
                <Textarea
                  id="prompt_text"
                  rows={4}
                  value={defaultPrompt?.prompt_text || ''}
                  onChange={(e) => setDefaultPrompt(prev => prev ? {...prev, prompt_text: e.target.value} : null)}
                  placeholder="Digite o prompt padrão para este usuário..."
                />
              </div>
            </div>
          </div>
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