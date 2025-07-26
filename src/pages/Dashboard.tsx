import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { CaseCard, Case } from "@/components/dashboard/CaseCard";
import { NewCaseForm } from "@/components/forms/NewCaseForm";
import { CaseDetailsModal } from "@/components/modals/CaseDetailsModal";
import { SettingsModal } from "@/components/modals/SettingsModal";
import { Plus, Search, Filter, FileText, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Session } from '@supabase/supabase-js';

interface DashboardProps {
  user: {
    name: string;
    email: string;
    id: string;
  };
  session: Session | null;
  onLogout: () => void;
}

interface DatabaseCase {
  id: string;
  title: string;
  description: string;
  status: "pending" | "processing" | "completed" | "failed";
  created_at: string;
  updated_at: string;
  attachments: { count: number }[];
  ai_responses: { count: number }[];
}

export default function Dashboard({ user, session, onLogout }: DashboardProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadCases();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredCases(cases);
    } else {
      const filtered = cases.filter(
        (case_) =>
          case_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          case_.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredCases(filtered);
    }
  }, [searchTerm, cases]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await supabase.functions.invoke('get-cases');

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success && response.data.cases) {
        const transformedCases: Case[] = response.data.cases.map((dbCase: DatabaseCase) => ({
          id: dbCase.id,
          title: dbCase.title,
          description: dbCase.description,
          status: dbCase.status === 'failed' ? 'error' : dbCase.status,
          createdAt: new Date(dbCase.created_at),
          attachmentsCount: dbCase.attachments?.[0]?.count || 0,
          aiResponse: undefined, // Será carregado quando abrir o modal
          hasAiResponse: dbCase.ai_responses?.[0]?.count > 0
        }));
        setCases(transformedCases);
        setFilteredCases(transformedCases);
      } else {
        setCases([]);
        setFilteredCases([]);
      }
    } catch (error) {
      console.error('Error loading cases:', error);
      toast({
        title: "Erro ao carregar casos",
        description: "Não foi possível carregar os casos. Tente novamente.",
        variant: "destructive",
      });
      setCases([]);
      setFilteredCases([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewCase = async (title: string, description: string, attachmentUrls: { filename: string; url: string; contentType: string; size: number }[]) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      // Preparar dados dos anexos já uploadados
      const attachments = attachmentUrls.map(attachment => ({
        filename: attachment.filename,
        file_size: attachment.size,
        content_type: attachment.contentType,
        file_url: attachment.url
      }));

      const caseData = {
        title,
        description,
        attachments
      };

      const response = await supabase.functions.invoke('create-case', {
        body: caseData,
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast({
          title: "Caso criado com sucesso!",
          description: "Seu caso foi criado e será processado em breve.",
        });
        setShowNewCaseForm(false);
        loadCases();
        
        // Processar automaticamente após criar
        setTimeout(() => {
          handleProcessCase(response.data.case.id);
        }, 1000);
      } else {
        throw new Error(response.data?.error || 'Erro ao criar caso');
      }
    } catch (error) {
      console.error('Error creating case:', error);
      toast({
        title: "Erro ao criar caso",
        description: "Não foi possível criar o caso. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleProcessCase = async (caseId: string) => {
    try {
      const response = await supabase.functions.invoke('process-case', {
        body: { caseId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast({
          title: "Processamento iniciado",
          description: "O caso está sendo analisado pela IA.",
        });
        loadCases();
      } else {
        throw new Error(response.data?.error || 'Erro ao processar caso');
      }
    } catch (error) {
      console.error('Error processing case:', error);
      toast({
        title: "Erro ao processar caso",
        description: "Não foi possível processar o caso. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleViewCase = async (caseId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await supabase.functions.invoke('get-cases?caseId=' + caseId);

      if (response.data?.success && response.data.case) {
        const fullCase = response.data.case;
        const transformedCase: Case = {
          id: fullCase.id,
          title: fullCase.title,
          description: fullCase.description,
          status: fullCase.status === 'failed' ? 'error' : fullCase.status,
          createdAt: new Date(fullCase.created_at),
          attachmentsCount: fullCase.attachments?.length || 0,
          aiResponse: fullCase.ai_responses?.[0]?.response_text,
          hasAiResponse: (fullCase.ai_responses?.length || 0) > 0
        };
        setSelectedCase(transformedCase);
      } else {
        // Fallback para caso local se não conseguir carregar detalhes
        const case_ = cases.find(c => c.id === caseId);
        if (case_) {
          setSelectedCase(case_);
        } else {
          throw new Error('Caso não encontrado');
        }
      }
    } catch (error) {
      console.error('Error loading case details:', error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar os detalhes do caso.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteCase = async (caseId: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', caseId);

      if (error) throw error;

      // Atualizar a lista local
      setCases(prev => prev.filter(c => c.id !== caseId));
      
      toast({
        title: "Caso excluído",
        description: "O caso foi removido com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting case:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover o caso.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadCase = async (caseId: string) => {
    try {
      // Primeiro carregar os dados completos do caso
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await supabase.functions.invoke('get-cases?caseId=' + caseId);

      let caseToDownload: Case;
      
      if (response.data?.success && response.data.case) {
        const fullCase = response.data.case;
        caseToDownload = {
          id: fullCase.id,
          title: fullCase.title,
          description: fullCase.description,
          status: fullCase.status === 'failed' ? 'error' : fullCase.status,
          createdAt: new Date(fullCase.created_at),
          attachmentsCount: fullCase.attachments?.length || 0,
          aiResponse: fullCase.ai_responses?.[0]?.response_text,
          hasAiResponse: (fullCase.ai_responses?.length || 0) > 0
        };
      } else {
        // Fallback para caso local
        const case_ = cases.find(c => c.id === caseId);
        if (!case_) {
          throw new Error('Caso não encontrado');
        }
        caseToDownload = case_;
      }

      // Criar conteúdo do relatório
      const reportContent = `RELATÓRIO DE ANÁLISE - CASO ${caseToDownload.id}

=================================================
INFORMAÇÕES GERAIS
=================================================
Título: ${caseToDownload.title}
Descrição: ${caseToDownload.description}
Status: ${caseToDownload.status}
Data de Criação: ${caseToDownload.createdAt.toLocaleDateString('pt-BR')}
Anexos: ${caseToDownload.attachmentsCount} arquivo(s)

=================================================
ANÁLISE DA IA
=================================================
${caseToDownload.aiResponse || 'Análise ainda não disponível. O caso pode não ter sido processado pela IA ainda.'}

=================================================
Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
Sistema IARA - Análise Inteligente de Casos
=================================================`;

      // Criar e baixar arquivo
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-caso-${caseToDownload.id.slice(0, 8)}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download concluído",
        description: "O relatório foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Error downloading case:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o relatório.",
        variant: "destructive",
      });
    }
  };

  const getStatusStats = () => {
    const pending = cases.filter(c => c.status === "pending").length;
    const processing = cases.filter(c => c.status === "processing").length;
    const completed = cases.filter(c => c.status === "completed").length;
    const failed = cases.filter(c => c.status === "error").length;
    return { pending, processing, completed, failed };
  };

  const stats = getStatusStats();

  if (showNewCaseForm) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={onLogout} onOpenSettings={() => setShowSettings(true)} />
        <main className="container mx-auto px-4 py-8">
          <NewCaseForm
            onSubmit={handleNewCase}
            onCancel={() => setShowNewCaseForm(false)}
          />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} onOpenSettings={() => setShowSettings(true)} />
      <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando casos...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} onOpenSettings={() => setShowSettings(true)} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header da página */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Meus Casos
              </h1>
              <p className="text-muted-foreground">
                Gerencie e acompanhe suas análises de IA
              </p>
            </div>
            <Button
              onClick={() => setShowNewCaseForm(true)}
              className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo Caso
            </Button>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-warning/10 to-warning/5 border border-warning/20 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-warning/20 rounded-lg">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pendentes</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 rounded-lg">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.processing}</p>
                  <p className="text-sm text-muted-foreground">Processando</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-success/10 to-success/5 border border-success/20 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-success/20 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
                  <p className="text-sm text-muted-foreground">Concluídos</p>
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-destructive/20 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.failed}</p>
                  <p className="text-sm text-muted-foreground">Falhas</p>
                </div>
              </div>
            </div>
          </div>

          {/* Busca e Filtros */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar casos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12"
              />
            </div>
            <Button variant="outline" className="md:w-auto">
              <Filter className="mr-2 h-4 w-4" />
              Filtros
            </Button>
          </div>

          {/* Lista de casos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCases.map((case_) => (
              <CaseCard
                key={case_.id}
                case={case_}
                onProcessCase={handleProcessCase}
                onViewCase={handleViewCase}
                onDownloadCase={handleDownloadCase}
                onDeleteCase={handleDeleteCase}
              />
            ))}
          </div>

          {filteredCases.length === 0 && !loading && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? "Nenhum caso encontrado" : "Nenhum caso criado"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Tente ajustar sua busca" : "Crie seu primeiro caso para começar"}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowNewCaseForm(true)}
                  className="bg-gradient-to-r from-primary to-primary-hover"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeiro Caso
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal de detalhes */}
      {selectedCase && (
        <CaseDetailsModal
          case={selectedCase}
          onClose={() => setSelectedCase(null)}
        />
      )}

      {/* Modal de configurações */}
      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />
    </div>
  );
}