import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { PendingApprovalMessage } from "@/components/auth/PendingApprovalMessage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPendingApproval, setShowPendingApproval] = useState(false);
  const {
    toast
  } = useToast();
  const handleLogin = async (email: string, password: string) => {
    try {
      const {
        data,
        error
      } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      if (error) {
        toast({
          title: "Erro no login",
          description: error.message,
          variant: "destructive"
        });
        return;
      }
      if (data.user) {
        // Verificar se o usuário está ativo
        const {
          data: profile,
          error: profileError
        } = await supabase.from('profiles').select('is_active').eq('user_id', data.user.id).maybeSingle();
        if (profileError) {
          console.error('Erro ao verificar perfil:', profileError);
          return;
        }
        if (profile && !profile.is_active) {
          // Fazer logout imediatamente se conta estiver inativa
          await supabase.auth.signOut();
          toast({
            title: "Conta inativa",
            description: "Sua conta foi desativada. Entre em contato com o administrador.",
            variant: "destructive"
          });
          return;
        }
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo de volta!"
        });
      }
    } catch (error) {
      toast({
        title: "Erro no login",
        description: "Erro inesperado. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  const handleRegister = async (name: string, email: string, password: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const {
        data,
        error
      } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name
          }
        }
      });
      if (error) throw error;

      // Enviar solicitação de aprovação
      if (data.user) {
        try {
          const {
            error: approvalError
          } = await supabase.functions.invoke('request-approval', {
            body: {
              userId: data.user.id,
              email: email,
              displayName: name
            }
          });
          if (approvalError) throw approvalError;
          setShowPendingApproval(true);
        } catch (approvalError: any) {
          console.error("Approval request error:", approvalError);
          toast({
            title: "Conta criada",
            description: "Conta criada mas houve erro no processo de aprovação. Entre em contato com o suporte.",
            variant: "destructive"
          });
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  return <div className="w-full h-screen relative overflow-hidden">
      {showPendingApproval ? <PendingApprovalMessage onBackToLogin={() => {
        setShowPendingApproval(false);
        setIsLogin(true);
      }} /> : isLogin ? <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setIsLogin(false)} /> : <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setIsLogin(true)} />}
    </div>;
}