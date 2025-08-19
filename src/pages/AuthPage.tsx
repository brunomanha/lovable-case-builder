import { useState } from "react";
import { LoginForm } from "@/components/auth/LoginForm";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { PendingApprovalMessage } from "@/components/auth/PendingApprovalMessage";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPendingApproval, setShowPendingApproval] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast({
            title: "Credenciais inválidas",
            description: "Email ou senha incorretos.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Erro no login",
            description: error.message,
            variant: "destructive"
          });
        }
        return;
      }

      if (data.user) {
        // Verificar se o usuário tem aprovação
        const { data: approval, error: approvalError } = await supabase
          .from('user_approvals')
          .select('status')
          .eq('user_id', data.user.id)
          .maybeSingle();

        if (approvalError) {
          console.error('Erro ao verificar aprovação:', approvalError);
          return;
        }

        // Se tem registro de aprovação mas não está aprovado
        if (approval && approval.status !== 'approved') {
          await supabase.auth.signOut();
          toast({
            title: "Conta pendente",
            description: approval.status === 'rejected' ? 
              "Sua conta foi rejeitada. Entre em contato com o suporte." :
              "Sua conta ainda está aguardando aprovação.",
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
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { name }
        }
      });

      if (error) throw error;

      // Fazer logout imediato para evitar acesso não aprovado
      await supabase.auth.signOut();

      // Enviar solicitação de aprovação
      if (data.user) {
        try {
          const { error: approvalError } = await supabase.functions.invoke('request-approval', {
            body: {
              userId: data.user.id,
              email: email,
              displayName: name
            }
          });

          if (approvalError) throw approvalError;
          
          toast({
            title: "Cadastro enviado com sucesso!",
            description: "Cadastro enviado para aprovação. Aguarde um administrador aprovar sua conta.",
            variant: "default",
          });
          
          setShowPendingApproval(true);
        } catch (approvalError: any) {
          console.error("Approval request error:", approvalError);
          toast({
            title: "Conta criada",
            description: "Conta criada mas houve erro no processo de aprovação. Entre em contato com o suporte.",
            variant: "destructive",
          });
          setShowPendingApproval(true); // Ainda mostrar a tela de pendente
        }
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      
      if (error.message?.includes('User already registered')) {
        toast({
          title: "Usuário já cadastrado",
          description: "Este email já está registrado. Tente fazer login.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="w-full min-h-screen relative">
      {showPendingApproval ? (
        <PendingApprovalMessage onBackToLogin={() => {
          setShowPendingApproval(false);
          setIsLogin(true);
        }} />
      ) : isLogin ? (
        <LoginForm onLogin={handleLogin} onSwitchToRegister={() => setIsLogin(false)} />
      ) : (
        <RegisterForm onRegister={handleRegister} onSwitchToLogin={() => setIsLogin(true)} />
      )}
    </div>
  );
}