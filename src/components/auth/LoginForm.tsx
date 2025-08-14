import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { HowItWorksModal } from "./HowItWorksModal";
import { Eye, EyeOff, Mail, Lock, Loader2, HelpCircle, Zap, Target, Settings, CheckCircle, ArrowRight, Sparkles } from "lucide-react";
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
  return <div className="w-full min-h-screen bg-gradient-to-br from-background via-accent/30 to-primary/10 relative overflow-hidden">
      {/* Modern Abstract Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-primary/20 to-transparent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-accent/30 to-transparent rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-primary/10 via-transparent to-accent/20 rounded-full blur-2xl"></div>
      </div>

      <div className="relative z-10 w-full min-h-screen px-4 py-6 sm:py-8 flex flex-col">
        <div className="w-full flex-1 flex flex-col">
          {/* Hero Section */}
          <div className="text-center mb-8 sm:mb-12">
            <div className="flex justify-center mb-6 sm:mb-8">
              <img src="/lovable-uploads/4f483727-be38-4ef1-8c2f-236b9f15c209.png" alt="IARA Assistente Virtual" className="h-32 sm:h-48 md:h-56 lg:h-64 w-auto drop-shadow-2xl hover:scale-105 transition-transform duration-300" onError={e => {
              e.currentTarget.src = '/placeholder.svg';
            }} />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-bold text-foreground mb-3 sm:mb-4 leading-tight px-2 sm:px-4">
              Inteligência Artificial para gerenciar
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent block sm:inline"> qualquer demanda</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-muted-foreground mb-4 sm:mb-6 max-w-3xl mx-auto leading-relaxed px-2 sm:px-4">
              De tarefas simples a projetos complexos, a IARA entende, organiza e entrega soluções rápidas.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-start w-full max-w-7xl mx-auto flex-1 min-h-0">
            {/* Login Form Column */}
            <div className="order-2 lg:order-1 w-full flex items-center justify-center">
              <div className="w-full max-w-md">
                <Card className="shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
                <CardContent className="p-6 sm:p-8">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-semibold text-foreground mb-2">Acesse sua conta</h2>
                    <p className="text-sm text-muted-foreground">Entre para gerenciar suas demandas</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email
                      </Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} className="pl-10 h-12 rounded-xl border-2 shadow-sm transition-all focus:shadow-md focus:ring-2 focus:ring-primary/20" disabled={isLoading} />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        Senha
                      </Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="password" type={showPassword ? "text" : "password"} placeholder="Sua senha" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 pr-10 h-12 rounded-xl border-2 shadow-sm transition-all focus:shadow-md focus:ring-2 focus:ring-primary/20" disabled={isLoading} />
                        <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-12 px-3 text-muted-foreground hover:text-foreground" onClick={() => setShowPassword(!showPassword)} disabled={isLoading}>
                          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full h-12 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 disabled:opacity-50 hover:scale-[1.02]" style={{
                      background: 'linear-gradient(135deg, hsl(178 60% 50%) 0%, hsl(271 76% 53%) 100%)',
                      color: 'white'
                    }} disabled={isLoading}>
                      {isLoading ? <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Entrando...
                        </> : "Entrar"}
                    </Button>
                    
                    <div className="flex justify-between items-center text-sm">
                      <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary" onClick={() => setShowForgotPassword(true)} disabled={isLoading}>
                        Esqueci minha senha
                      </Button>
                      
                      <Button variant="link" className="p-0 h-auto text-muted-foreground hover:text-primary flex items-center gap-1" onClick={() => setShowHowItWorks(true)} disabled={isLoading}>
                        <HelpCircle className="h-3 w-3" />
                        Como funciona?
                      </Button>
                    </div>
                  </form>

                  <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground mb-4">
                      Não tem uma conta?
                    </p>
                    <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-medium hover:bg-accent transition-all duration-300" onClick={onSwitchToRegister} disabled={isLoading}>
                      Criar conta
                    </Button>
                  </div>
                </CardContent>
                </Card>
              </div>
            </div>

            {/* Benefits Column */}
            <div className="order-1 lg:order-2 space-y-6 sm:space-y-8 w-full overflow-hidden">
              {/* Commercial Benefits Section */}
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground text-center lg:text-left px-2">
                  Por que escolher a IARA?
                </h3>
                
                <div className="grid gap-4">
                  <div className="flex items-start gap-4 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 hover:shadow-md transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                      <Zap className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Produtividade Máxima</h4>
                      <p className="text-sm text-muted-foreground">Centralize e agilize todas as suas demandas em um só lugar.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 hover:shadow-md transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-success to-success/80 flex items-center justify-center">
                      <Target className="h-5 w-5 text-success-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Inteligência Aplicada</h4>
                      <p className="text-sm text-muted-foreground">Respostas precisas e rápidas para qualquer necessidade.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 hover:shadow-md transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-warning to-warning/80 flex items-center justify-center">
                      <Settings className="h-5 w-5 text-warning-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Versatilidade Total</h4>
                      <p className="text-sm text-muted-foreground">Funciona para qualquer nicho, de advocacia a marketing.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4 p-4 rounded-xl bg-card/60 backdrop-blur-sm border border-border/50 hover:shadow-md transition-all duration-300">
                    <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-accent/80 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-1">Organização Garantida</h4>
                      <p className="text-sm text-muted-foreground">Fluxo claro e acompanhamento de cada tarefa.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* How It Works Section */}
              <div className="space-y-4 sm:space-y-6">
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground text-center lg:text-left px-2">
                  Como funciona
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Envie sua demanda</p>
                      <p className="text-sm text-muted-foreground">Descreva o que precisa e anexe arquivos</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-success/10 to-transparent border border-success/20">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-success text-success-foreground flex items-center justify-center font-bold text-sm">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-foreground">A IARA analisa e organiza</p>
                      <p className="text-sm text-muted-foreground">IA processa e estrutura sua solicitação</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-warning/10 to-transparent border border-warning/20">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-warning text-warning-foreground flex items-center justify-center font-bold text-sm">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Você recebe soluções</p>
                      <p className="text-sm text-muted-foreground">Resultados precisos e organizados</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Footer */}
          <div className="text-center py-4 mt-auto">
            <div className="text-xs text-muted-foreground space-y-2">
              <p>© 2024 IARA Assistente Virtual • v1.0</p>
              <Button variant="link" className="p-0 h-auto text-xs text-muted-foreground hover:text-primary">
                Política de Privacidade
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <ForgotPasswordModal isOpen={showForgotPassword} onClose={() => setShowForgotPassword(false)} />
      
      <HowItWorksModal isOpen={showHowItWorks} onClose={() => setShowHowItWorks(false)} />
    </div>;
}