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
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Primeiro verificar se é admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        const isUserAdmin = !!roleData;
        setIsAdmin(isUserAdmin);

        // Se é admin, permitir acesso direto
        if (isUserAdmin) {
          setLoading(false);
          return;
        }

        // Para usuários normais, verificar aprovação
        const { data: approvalData } = await supabase
          .from('user_approvals')
          .select('status')
          .eq('user_id', session.user.id)
          .eq('status', 'approved')
          .maybeSingle();

        // Se não tem aprovação, fazer logout
        if (!approvalData) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        // Primeiro verificar se é admin
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('role', 'admin')
          .maybeSingle();
        
        const isUserAdmin = !!roleData;
        setIsAdmin(isUserAdmin);

        // Se é admin, permitir acesso direto
        if (isUserAdmin) {
          setLoading(false);
          return;
        }

        // Para usuários normais, verificar aprovação
        const { data: approvalData } = await supabase
          .from('user_approvals')
          .select('status')
          .eq('user_id', session.user.id)
          .eq('status', 'approved')
          .maybeSingle();

        // Se não tem aprovação, fazer logout
        if (!approvalData) {
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setIsAdmin(false);
          setLoading(false);
          return;
        }
      } else {
        setIsAdmin(false);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
    setIsAdmin(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const userProps = {
    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
    email: user.email || '',
    id: user.id
  };

  // Se o usuário é admin, mostrar painel administrativo
  if (isAdmin) {
    return (
      <AdminDashboard 
        user={userProps}
        session={session}
        onLogout={handleLogout}
      />
    );
  }

  // Caso contrário, mostrar dashboard normal
  return (
    <Dashboard 
      user={userProps}
      session={session}
      onLogout={handleLogout}
    />
  );
};

export default Index;
