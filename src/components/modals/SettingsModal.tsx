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
import { useToast } from "@/hooks/use-toast";
import { Settings, Save } from "lucide-react";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Carregar prompt salvo do localStorage
    const savedPrompt = localStorage.getItem("default-ai-prompt");
    if (savedPrompt) {
      setDefaultPrompt(savedPrompt);
    } else {
      // Prompt padrão
      setDefaultPrompt(`Você é um assistente especializado em análise de documentos e casos técnicos.

Por favor, analise cuidadosamente o caso apresentado e forneça:

1. **Resumo Executivo**: Síntese clara dos pontos principais
2. **Análise Detalhada**: Exame técnico aprofundado dos documentos
3. **Principais Achados**: Pontos críticos identificados
4. **Recomendações**: Próximos passos sugeridos
5. **Considerações Importantes**: Alertas e observações relevantes

Seja objetivo, profissional e forneça insights valiosos baseados nas informações apresentadas.`);
    }
  }, [isOpen]);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Salvar no localStorage
      localStorage.setItem("default-ai-prompt", defaultPrompt.trim());
      
      toast({
        title: "Configurações salvas",
        description: "O prompt padrão foi atualizado com sucesso.",
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

  const handleReset = () => {
    setDefaultPrompt(`Você é um assistente especializado em análise de documentos e casos técnicos.

Por favor, analise cuidadosamente o caso apresentado e forneça:

1. **Resumo Executivo**: Síntese clara dos pontos principais
2. **Análise Detalhada**: Exame técnico aprofundado dos documentos
3. **Principais Achados**: Pontos críticos identificados
4. **Recomendações**: Próximos passos sugeridos
5. **Considerações Importantes**: Alertas e observações relevantes

Seja objetivo, profissional e forneça insights valiosos baseados nas informações apresentadas.`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações do Sistema
          </DialogTitle>
          <DialogDescription>
            Configure o comportamento padrão da IA para análise de casos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-3">
            <Label htmlFor="defaultPrompt" className="text-sm font-medium">
              Prompt Padrão da IA
            </Label>
            <p className="text-sm text-muted-foreground">
              Este prompt será usado automaticamente em todas as análises de casos. 
              Personalize para adequar ao seu tipo de trabalho específico.
            </p>
            <Textarea
              id="defaultPrompt"
              value={defaultPrompt}
              onChange={(e) => setDefaultPrompt(e.target.value)}
              className="min-h-[300px] resize-none"
              placeholder="Digite o prompt padrão que a IA deve usar..."
              disabled={isLoading}
            />
            <p className="text-xs text-muted-foreground">
              Caracteres: {defaultPrompt.length}
            </p>
          </div>
        </div>

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