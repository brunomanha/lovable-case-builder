import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Mail, ArrowLeft } from "lucide-react";

interface PendingApprovalMessageProps {
  onBackToLogin: () => void;
}

export function PendingApprovalMessage({ onBackToLogin }: PendingApprovalMessageProps) {
  return (
    <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm">
      <CardHeader className="space-y-1 pb-6 text-center">
        <div className="flex justify-center mb-4">
          <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center">
            <Clock className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center">
          Aguardando Aprovação
        </CardTitle>
        <CardDescription className="text-center text-muted-foreground">
          Sua solicitação de criação de conta foi enviada
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center space-y-4">
          <div className="flex items-start gap-3 text-left">
            <Mail className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium">
                Solicitação Enviada
              </p>
              <p className="text-sm text-muted-foreground">
                Seu cadastro foi enviado para análise do administrador. 
                Você receberá um email quando sua conta for aprovada.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Próximos Passos:</strong>
              <br />
              1. Aguarde a análise do administrador
              <br />
              2. Verifique seu email para a confirmação
              <br />
              3. Após aprovação, faça login normalmente
            </p>
          </div>

          <p className="text-xs text-muted-foreground">
            Este processo garante a segurança e qualidade do acesso ao sistema IARA.
          </p>
        </div>

        <Button 
          variant="outline" 
          className="w-full" 
          onClick={onBackToLogin}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Login
        </Button>
      </CardContent>
    </Card>
  );
}