import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { Eye, EyeOff, Mail, Lock, Loader2 } from "lucide-react";
interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onSwitchToRegister: () => void;
}
export function LoginForm({
  onLogin,
  onSwitchToRegister
}: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const {
    toast
  } = useToast();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Input validation and sanitization
    const sanitizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!sanitizedEmail || !password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos.",
        variant: "destructive"
      });
      return;
    }
    if (!emailRegex.test(sanitizedEmail)) {
      toast({
        title: "Email inválido",
        description: "Por favor, insira um email válido.",
        variant: "destructive"
      });
      return;
    }
    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      await onLogin(sanitizedEmail, password);
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  return <Card className="w-full max-w-md shadow-xl border-0 bg-card/95 backdrop-blur-sm mx-auto">
      <CardHeader className="space-y-1 pb-4 sm:pb-6">
        <div className="flex justify-center mb-2">
          <img 
            src="/iara-logo.png" 
            alt="IARA Logo" 
            className="h-12 sm:h-16 w-auto"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        </div>
        <CardDescription className="text-center text-muted-foreground text-sm">Inteligência Aplicada e Relatórios de Autos</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium">
              Email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12 transition-colors focus:ring-2 focus:ring-primary/20" disabled={isLoading} />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium">
              Senha
            </Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-12 transition-colors focus:ring-2 focus:ring-primary/20" disabled={isLoading} />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-12 px-3 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <Button type="submit" className="w-full h-12 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50" disabled={isLoading}>
            {isLoading ? <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Entrando...
              </> : "Entrar"}
          </Button>
          
          <div className="mt-4 text-center">
            <Button 
              variant="link" 
              className="p-0 h-auto text-sm text-muted-foreground hover:text-primary" 
              onClick={() => setShowForgotPassword(true)}
              disabled={isLoading}
            >
              Esqueci minha senha
            </Button>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Não tem uma conta?{" "}
            <Button variant="link" className="p-0 h-auto font-medium text-primary hover:text-primary-hover" onClick={onSwitchToRegister} disabled={isLoading}>
              Criar conta
            </Button>
          </p>
        </div>

        {/* Seção de Marketing */}
        <div className="mt-6 sm:mt-8 p-4 sm:p-6 bg-gradient-to-br from-primary/5 to-accent/10 rounded-lg border">
          <h3 className="text-base sm:text-lg font-semibold text-center mb-3 sm:mb-4">
            IARA - Inteligência Aplicada e Relatórios de Autos
          </h3>
          
          <div className="space-y-3 text-sm text-muted-foreground">
            <div className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span><strong>Análise Inteligente:</strong> IA avançada para análise de documentos jurídicos</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span><strong>Múltiplos Formatos:</strong> PDF, Word, imagens e documentos de texto</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span><strong>Relatórios Detalhados:</strong> Resumos, análises e recomendações personalizadas</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span><strong>Interface Intuitiva:</strong> Fácil de usar, resultados em minutos</span>
            </div>
            
            <div className="flex items-start gap-2">
              <span className="text-primary">✓</span>
              <span><strong>Segurança Garantida:</strong> Seus documentos protegidos com criptografia</span>
            </div>
          </div>
          
          <div className="mt-4 p-3 bg-primary/10 rounded text-center">
            <p className="text-xs font-medium text-primary">
              🚀 Transforme sua análise jurídica com o poder da IA
            </p>
          </div>
        </div>
      </CardContent>
      
      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
    </Card>;
}