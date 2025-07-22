import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useToast } from "@/hooks/use-toast";

interface AuthPageProps {
  onLogin: (user: { name: string; email: string; id: string }) => void;
}

export default function AuthPage({ onLogin }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const { toast } = useToast();

  const handleLogin = async (email: string, password: string) => {
    // Simulação de login (em produção, conectar com Supabase)
    if (email === "demo@email.com" && password === "123456") {
      const user = {
        id: "demo-user-id",
        name: "Usuário Demo",
        email: email,
      };
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo de volta, ${user.name}!`,
      });
      
      onLogin(user);
    } else {
      toast({
        title: "Credenciais inválidas",
        description: "Use: demo@email.com / 123456 para testar",
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (name: string, email: string, password: string) => {
    // Simulação de registro (em produção, conectar com Supabase)
    const user = {
      id: `user-${Date.now()}`,
      name: name,
      email: email,
    };
    
    toast({
      title: "Conta criada com sucesso!",
      description: `Bem-vindo, ${user.name}!`,
    });
    
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {isLogin ? (
          <LoginForm
            onLogin={handleLogin}
            onSwitchToRegister={() => setIsLogin(false)}
          />
        ) : (
          <RegisterForm
            onRegister={handleRegister}
            onSwitchToLogin={() => setIsLogin(true)}
          />
        )}
      </div>
    </div>
  );
}