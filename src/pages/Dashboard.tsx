import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { CaseCard, Case } from "@/components/dashboard/CaseCard";
import { NewCaseForm } from "@/components/forms/NewCaseForm";
import { CaseDetailsModal } from "@/components/modals/CaseDetailsModal";
import { Plus, Search, Filter, FileText, Clock, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DashboardProps {
  user: {
    name: string;
    email: string;
    id: string;
  };
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewCaseForm, setShowNewCaseForm] = useState(false);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const { toast } = useToast();

  // Dados mock para demonstração
  useEffect(() => {
    const mockCases: Case[] = [
      {
        id: "1",
        title: "Análise de Contrato de Prestação de Serviços",
        description: "Revisão de cláusulas contratuais e identificação de riscos legais",
        status: "completed",
        createdAt: new Date(2024, 0, 15, 14, 30),
        attachmentsCount: 3,
        aiResponse: "A análise do contrato identificou 5 pontos de atenção principais: 1) Cláusula de penalidade desproporcional (item 4.2), 2) Falta de definição clara de escopo (item 2.1), 3) Prazo de pagamento inadequado (item 5.3), 4) Ausência de cláusula de confidencialidade, 5) Responsabilidade civil mal definida. Recomenda-se revisão dos termos antes da assinatura."
      },
      {
        id: "2",
        title: "Due Diligence - Aquisição Empresarial",
        description: "Verificação de documentos corporativos e compliance fiscal",
        status: "processing",
        createdAt: new Date(2024, 0, 22, 9, 15),
        attachmentsCount: 12,
      },
      {
        id: "3",
        title: "Revisão de Política de Privacidade LGPD",
        description: "Adequação à Lei Geral de Proteção de Dados",
        status: "pending",
        createdAt: new Date(2024, 0, 25, 16, 45),
        attachmentsCount: 2,
      },
      {
        id: "4",
        title: "Análise de Acordo Trabalhista",
        description: "Verificação de conformidade com CLT e convenções coletivas",
        status: "completed",
        createdAt: new Date(2024, 0, 10, 11, 20),
        attachmentsCount: 5,
        aiResponse: "O acordo trabalhista apresenta conformidade geral com a CLT. Pontos positivos: salário acima do piso da categoria, benefícios adequados, jornada regular. Atenção para: cláusula de banco de horas (verificar limite legal), adicional de periculosidade (confirmar atividade), e período de experiência (máximo 90 dias). Documento aprovado com ressalvas."
      }
    ];
    setCases(mockCases);
    setFilteredCases(mockCases);
  }, []);

  // Filtrar casos conforme busca
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

  const handleNewCase = async (title: string, description: string, files: File[]) => {
    const newCase: Case = {
      id: `case-${Date.now()}`,
      title,
      description,
      status: "pending",
      createdAt: new Date(),
      attachmentsCount: files.length,
    };

    setCases(prev => [newCase, ...prev]);
    setShowNewCaseForm(false);

    // Simular processamento
    setTimeout(() => {
      setCases(prev => prev.map(c => 
        c.id === newCase.id ? { ...c, status: "processing" } : c
      ));
    }, 2000);

    setTimeout(() => {
      setCases(prev => prev.map(c => 
        c.id === newCase.id ? { 
          ...c, 
          status: "completed",
          aiResponse: "Análise concluída com sucesso. A IA processou todos os documentos e identificou os principais pontos relevantes. Consulte o relatório detalhado para mais informações."
        } : c
      ));
    }, 8000);
  };

  const handleViewCase = (caseId: string) => {
    const case_ = cases.find(c => c.id === caseId);
    if (case_) {
      setSelectedCase(case_);
    }
  };

  const handleDownloadCase = (caseId: string) => {
    toast({
      title: "Download iniciado",
      description: "O relatório será baixado em breve.",
    });
  };

  const getStatusStats = () => {
    const pending = cases.filter(c => c.status === "pending").length;
    const processing = cases.filter(c => c.status === "processing").length;
    const completed = cases.filter(c => c.status === "completed").length;
    return { pending, processing, completed };
  };

  const stats = getStatusStats();

  if (showNewCaseForm) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={onLogout} />
        <main className="container mx-auto px-4 py-8">
          <NewCaseForm
            onSubmit={handleNewCase}
            onCancel={() => setShowNewCaseForm(false)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} />
      
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                onView={handleViewCase}
                onDownload={handleDownloadCase}
              />
            ))}
          </div>

          {filteredCases.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum caso encontrado
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
    </div>
  );
}