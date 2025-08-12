import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { HowItWorksModal } from "./HowItWorksModal";
import { Eye, EyeOff, Mail, Lock, Loader2, HelpCircle } from "lucide-react";
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
  const [showHowItWorks, setShowHowItWorks] = useState(false);
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
  return (
    <div className="w-full max-w-md mx-auto">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/74228248-3957-4616-a5a6-55d4638742ab.png" 
            alt="IARA Logo"
            className="h-20 sm:h-24 w-auto drop-shadow-lg"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
          IARA Assistente Virtual
        </h1>
        <p className="text-lg text-muted-foreground mb-2">
          Seu assistente virtual para qualquer demanda.
        </p>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Descreva sua necessidade, envie anexos e deixe a IARA cuidar do resto.
        </p>
      </div>

      {/* Login Form */}
      <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="pl-10 h-12 rounded-xl border-2 shadow-sm transition-all focus:shadow-md focus:ring-2 focus:ring-primary/20" 
                  disabled={isLoading} 
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Sua senha" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)} 
                  className="pl-10 pr-10 h-12 rounded-xl border-2 shadow-sm transition-all focus:shadow-md focus:ring-2 focus:ring-primary/20" 
                  disabled={isLoading} 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-0 top-0 h-12 px-3 text-muted-foreground hover:text-foreground" 
                  onClick={() => setShowPassword(!showPassword)} 
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 hover:scale-[1.02]" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>
            
            <div className="flex justify-between items-center text-sm">
              <Button 
                variant="link" 
                className="p-0 h-auto text-muted-foreground hover:text-primary" 
                onClick={() => setShowForgotPassword(true)}
                disabled={isLoading}
              >
                Esqueci minha senha
              </Button>
              
              <Button 
                variant="link" 
                className="p-0 h-auto text-muted-foreground hover:text-primary flex items-center gap-1" 
                onClick={() => setShowHowItWorks(true)}
                disabled={isLoading}
              >
                <HelpCircle className="h-3 w-3" />
                Como funciona?
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Não tem uma conta?
            </p>
            <Button 
              variant="outline" 
              className="w-full h-12 rounded-xl border-2 font-medium hover:bg-accent transition-all duration-300" 
              onClick={onSwitchToRegister} 
              disabled={isLoading}
            >
              Criar conta
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Footer */}
      <div className="text-center mt-8 text-xs text-muted-foreground">
        © 2024 IARA Assistente Virtual • v1.0
      </div>
      
      <ForgotPasswordModal 
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
      />
      
      <HowItWorksModal 
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </div>
  );
}