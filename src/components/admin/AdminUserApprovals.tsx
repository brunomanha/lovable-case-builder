import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, UserPlus } from "lucide-react";

interface UserApproval {
  id: string;
  user_id: string;
  email: string;
  display_name: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  approval_date: string | null;
  approved_by: string | null;
}

const AdminUserApprovals = () => {
  const [approvals, setApprovals] = useState<UserApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadApprovals();
  }, []);

  const loadApprovals = async () => {
    try {
      const { data, error } = await supabase
        .from('user_approvals')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApprovals(data as UserApproval[] || []);
    } catch (error) {
      console.error('Erro ao carregar aprovações:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de aprovações.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (userId: string, action: 'approved' | 'rejected') => {
    try {
      // Atualizar status da aprovação
      const { error: approvalError } = await supabase
        .from('user_approvals')
        .update({
          status: action,
          approval_date: new Date().toISOString(),
          approved_by: 'admin' // Você pode pegar o nome do admin atual
        })
        .eq('user_id', userId);

      if (approvalError) throw approvalError;

      if (action === 'approved') {
        // Criar role de usuário padrão
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: 'user'
          });

        if (roleError && !roleError.message.includes('duplicate key')) {
          throw roleError;
        }
      }

      toast({
        title: "Sucesso",
        description: `Usuário ${action === 'approved' ? 'aprovado' : 'rejeitado'} com sucesso.`,
      });

      loadApprovals();
    } catch (error) {
      console.error('Erro ao processar aprovação:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar aprovação.",
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="text-yellow-600"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><Check className="h-3 w-3 mr-1" />Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Aprovações de Usuários
        </CardTitle>
        <CardDescription>
          Gerencie solicitações de criação de conta
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data da Solicitação</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {approvals.map((approval) => (
              <TableRow key={approval.id}>
                <TableCell className="font-medium">
                  {approval.display_name || "Não informado"}
                </TableCell>
                <TableCell>{approval.email}</TableCell>
                <TableCell>
                  {getStatusBadge(approval.status)}
                </TableCell>
                <TableCell>
                  {new Date(approval.created_at).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>
                  {approval.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-500 hover:bg-green-600"
                        onClick={() => handleApproval(approval.user_id, 'approved')}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Aprovar
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleApproval(approval.user_id, 'rejected')}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  )}
                  {approval.status !== 'pending' && (
                    <span className="text-sm text-muted-foreground">
                      {approval.approval_date && 
                        `Processado em ${new Date(approval.approval_date).toLocaleDateString('pt-BR')}`
                      }
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {approvals.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Nenhuma solicitação de aprovação encontrada.
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminUserApprovals;