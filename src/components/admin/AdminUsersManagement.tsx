import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Search, Shield, User, Settings, Plus, Trash2 } from "lucide-react";
import UserConfigurationModal from "./UserConfigurationModal";

interface UserProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  email: string | null;
  created_at: string;
  role?: string;
}

const AdminUsersManagement = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserProfile[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      setFilteredUsers(users.filter(user => 
        user.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      ));
    } else {
      setFilteredUsers(users);
    }
  }, [searchTerm, users]);

  const loadUsers = async () => {
    try {
      // Carregar profiles com roles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profiles) {
        // Carregar roles para cada usuário
        const usersWithRoles = await Promise.all(
          profiles.map(async (profile) => {
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', profile.user_id)
              .single();
            
            return {
              ...profile,
              role: (roleData?.role as 'admin' | 'user') || 'user'
            };
          })
        );

        setUsers(usersWithRoles);
      }
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      // Primeiro, verificar se já existe um role para este usuário
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingRole) {
        // Atualizar role existente
        const { error } = await supabase
          .from('user_roles')
          .update({ role: newRole as 'admin' | 'user' })
          .eq('user_id', userId);

        if (error) throw error;
      } else {
        // Inserir novo role
        const { error } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, role: newRole as 'admin' | 'user' });

        if (error) throw error;
      }

      toast({
        title: "Sucesso",
        description: "Role do usuário atualizado com sucesso.",
      });

      loadUsers();
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar role do usuário.",
        variant: "destructive",
      });
    }
  };

  const handleManageUserSettings = (user: UserProfile) => {
    setSelectedUser(user);
    setIsDialogOpen(true);
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.display_name || user.email}?`)) {
      return;
    }

    try {
      // Excluir user_roles
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.user_id);

      // Excluir ai_settings
      await supabase
        .from('ai_settings')
        .delete()
        .eq('user_id', user.user_id);

      // Excluir default_prompts
      await supabase
        .from('default_prompts')
        .delete()
        .eq('user_id', user.user_id);

      // Excluir user_approvals
      await supabase
        .from('user_approvals')
        .delete()
        .eq('user_id', user.user_id);

      // Excluir profile
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso.",
      });

      loadUsers();
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário.",
        variant: "destructive",
      });
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
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Gerenciamento de Usuários
          </CardTitle>
          <CardDescription>
            Gerencie usuários, roles e configurações do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Barra de pesquisa */}
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pesquisar usuários..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {/* Tabela de usuários */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">
                    {user.display_name || "Não informado"}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Select
                      value={user.role}
                      onValueChange={(value) => handleRoleChange(user.user_id, value)}
                    >
                      <SelectTrigger className="w-[120px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <User className="h-3 w-3" />
                            Usuário
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-3 w-3" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleManageUserSettings(user)}
                      >
                        <Settings className="h-3 w-3 mr-1" />
                        Configurar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteUser(user)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredUsers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum usuário encontrado.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal para configurações do usuário */}
      <UserConfigurationModal
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        user={selectedUser}
      />
    </div>
  );
};

export default AdminUsersManagement;