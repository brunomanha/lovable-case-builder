
import { useState, useEffect } from "react";
import AuthPage from "./AuthPage";
import Dashboard from "./Dashboard";
import AdminDashboard from "./AdminDashboard";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state change:', event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Defer Supabase calls to prevent deadlock
        setTimeout(async () => {
          try {
            console.log('Verificando permissões para usuário:', session.user.email);
            
            // Primeiro verificar se é admin
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .eq('role', 'admin')
              .maybeSingle();
            
            if (roleError) {
              console.error('Erro ao verificar role:', roleError);
            }

            const isUserAdmin = !!roleData;
            console.log('É admin?', isUserAdmin);
            setIsAdmin(isUserAdmin);

            // Se é admin, permitir acesso direto
            if (isUserAdmin) {
              console.log('Usuário é admin, permitindo acesso');
              setLoading(false);
              return;
            }

            // Para usuários normais, verificar aprovação
            const { data: approvalData, error: approvalError } = await supabase
              .from('user_approvals')
              .select('status')
              .eq('user_id', session.user.id)
              .maybeSingle();

            if (approvalError) {
              console.error('Erro ao verificar aprovação:', approvalError);
              // Se houver erro na consulta, não bloquear o acesso
              setLoading(false);
              return;
            }

            console.log('Status de aprovação:', approvalData);

            // Se não tem aprovação, significa que o usuário nunca se registrou pelo sistema
            // Apenas usuários com status pendente devem ser bloqueados
            if (approvalData && approvalData.status !== 'approved') {
              console.log('Usuário com aprovação pendente, fazendo logout. Status:', approvalData.status);
              await supabase.auth.signOut();
              setSession(null);
              setUser(null);
              setIsAdmin(false);
              setLoading(false);
              return;
            }
            
            console.log('Usuário aprovado, permitindo acesso');
            setLoading(false);
          } catch (error) {
            console.error('Erro ao verificar permissões:', error);
            setLoading(false);
          }
        }, 0);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('Sessão existente encontrada:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        try {
          // Primeiro verificar se é admin
          const { data: roleData, error: roleError } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .eq('role', 'admin')
            .maybeSingle();
          
          if (roleError) {
            console.error('Erro ao verificar role na sessão inicial:', roleError);
          }

          const isUserAdmin = !!roleData;
          console.log('Verificação inicial - É admin?', isUserAdmin);
          setIsAdmin(isUserAdmin);

          // Se é admin, permitir acesso direto
          if (isUserAdmin) {
            console.log('Sessão inicial - Usuário é admin, permitindo acesso');
            setLoading(false);
            return;
          }

          // Para usuários normais, verificar aprovação
          const { data: approvalData, error: approvalError } = await supabase
            .from('user_approvals')
            .select('status')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (approvalError) {
            console.error('Erro ao verificar aprovação na sessão inicial:', approvalError);
            // Se houver erro na consulta, não bloquear o acesso
            setLoading(false);
            return;
          }

          console.log('Verificação inicial - Status de aprovação:', approvalData);

          // Se não tem aprovação, significa que o usuário nunca se registrou pelo sistema
          // Apenas usuários com status pendente devem ser bloqueados
          if (approvalData && approvalData.status !== 'approved') {
            console.log('Sessão inicial - Usuário com aprovação pendente, fazendo logout. Status:', approvalData.status);
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsAdmin(false);
            setLoading(false);
            return;
          }

          console.log('Sessão inicial - Usuário aprovado, permitindo acesso');
        } catch (error) {
          console.error('Erro na verificação inicial:', error);
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    console.log('Fazendo logout manual');
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  };

  if (loading) {
    console.log('Estado de loading ativo');
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    console.log('Usuário não encontrado, redirecionando para AuthPage');
    return <AuthPage />;
  }

  const userProps = {
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
    email: user.email || '',
    id: user.id
  };

  console.log('Usuário autenticado:', userProps.email, 'Admin:', isAdmin);

  // Se o usuário é admin, mostrar painel administrativo
  if (isAdmin) {
    console.log('Renderizando AdminDashboard');
    return (
      <AdminDashboard 
        user={userProps}
        session={session}
        onLogout={handleLogout}
      />
    );
  }

  // Caso contrário, mostrar dashboard normal
  console.log('Renderizando Dashboard normal');
  return (
    <Dashboard 
      user={userProps}
      session={session}
      onLogout={handleLogout}
    />
  );
};

export default Index;
