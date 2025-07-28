import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from '@supabase/supabase-js';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, FileText, Activity, Settings, Shield } from "lucide-react";
import AdminUsersManagement from "@/components/admin/AdminUsersManagement";
import AdminDashboardStats from "@/components/admin/AdminDashboardStats";
import AdminSystemSettings from "@/components/admin/AdminSystemSettings";

interface AdminDashboardProps {
  user: {
    name: string;
    email: string;
    id: string;
  };
  session: Session | null;
  onLogout: () => void;
}

interface DashboardStats {
  totalUsers: number;
  totalCases: number;
  casesThisMonth: number;
  activeUsers: number;
  totalApiRequests: number;
  avgProcessingTime: number;
}

const AdminDashboard = ({ user, session, onLogout }: AdminDashboardProps) => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalCases: 0,
    casesThisMonth: 0,
    activeUsers: 0,
    totalApiRequests: 0,
    avgProcessingTime: 0
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      // Verificar se o usuário é admin
      const { data: userRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (!userRole) {
        toast({
          title: "Acesso negado",
          description: "Você não tem permissão para acessar esta área.",
          variant: "destructive",
        });
        return;
      }

      // Carregar estatísticas
      const [usersResult, casesResult, processingLogsResult] = await Promise.all([
        supabase.from('profiles').select('id'),
        supabase.from('cases').select('id, created_at, user_id'),
        supabase.from('ai_processing_logs').select('processing_time, created_at')
      ]);

      const totalUsers = usersResult.data?.length || 0;
      const totalCases = casesResult.data?.length || 0;
      
      // Casos deste mês
      const thisMonth = new Date();
      thisMonth.setDate(1);
      const casesThisMonth = casesResult.data?.filter(c => 
        new Date(c.created_at) >= thisMonth
      ).length || 0;

      // Usuários ativos (que criaram casos nos últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCases = casesResult.data?.filter(c => 
        new Date(c.created_at) >= thirtyDaysAgo
      ) || [];
      const activeUserIds = new Set(recentCases.map(c => c.user_id));
      const activeUsers = activeUserIds.size;

      // Estatísticas de processamento
      const totalApiRequests = processingLogsResult.data?.length || 0;
      const avgProcessingTime = processingLogsResult.data?.reduce((acc, log) => 
        acc + (log.processing_time || 0), 0
      ) / (processingLogsResult.data?.length || 1);

      setStats({
        totalUsers,
        totalCases,
        casesThisMonth,
        activeUsers,
        totalApiRequests,
        avgProcessingTime: Math.round(avgProcessingTime)
      });

    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar estatísticas do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-primary">Painel Administrativo</h1>
              <p className="text-sm text-muted-foreground">Sistema IARA - Administração</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="secondary" className="gap-2">
              <Shield className="h-3 w-3" />
              Administrador
            </Badge>
            <div className="text-right">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" onClick={onLogout}>
              Sair
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários
            </TabsTrigger>
            <TabsTrigger value="cases" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Casos
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <AdminDashboardStats stats={stats} />
          </TabsContent>

          <TabsContent value="users">
            <AdminUsersManagement />
          </TabsContent>

          <TabsContent value="cases">
            <Card>
              <CardHeader>
                <CardTitle>Gerenciamento de Casos</CardTitle>
                <CardDescription>
                  Visualize e gerencie todos os casos do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">Em desenvolvimento...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <AdminSystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AdminDashboard;