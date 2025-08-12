import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle, Upload, Brain, Sparkles } from "lucide-react";

interface HowItWorksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function HowItWorksModal({ isOpen, onClose }: HowItWorksModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Como funciona a IARA?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Upload className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">1. Envie sua demanda</h3>
              <p className="text-sm text-muted-foreground">
                Descreva sua necessidade e anexe documentos, imagens ou arquivos relevantes.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">2. A IARA analisa e organiza</h3>
              <p className="text-sm text-muted-foreground">
                Nossa IA processa e compreende suas informações para gerar insights precisos.
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium mb-1">3. Receba soluções rápidas e precisas</h3>
              <p className="text-sm text-muted-foreground">
                Obtenha relatórios detalhados, análises e recomendações personalizadas.
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex justify-center pt-4">
          <Button onClick={onClose} className="w-full">
            Entendi!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}