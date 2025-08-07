import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Header } from "@/components/layout/Header";
import { TaskCard, Task } from "@/components/dashboard/TaskCard";
import { NewTaskForm } from "@/components/forms/NewTaskForm";
import { TaskDetailsModal } from "@/components/modals/TaskDetailsModal";

import { ProfileModal } from "@/components/modals/ProfileModal";
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

interface DatabaseTask {
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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  const [showProfile, setShowProfile] = useState(false);
  const [demoLimitation, setDemoLimitation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredTasks(tasks);
    } else {
      const filtered = tasks.filter(
        (task_) =>
          task_.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          task_.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTasks(filtered);
    }
  }, [searchTerm, tasks]);

  const loadTasks = async () => {
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
        const transformedTasks: Task[] = response.data.cases.map((dbTask: DatabaseTask) => ({
          id: dbTask.id,
          title: dbTask.title,
          description: dbTask.description,
          status: dbTask.status === 'failed' ? 'error' : dbTask.status,
          createdAt: new Date(dbTask.created_at),
          attachmentsCount: dbTask.attachments?.[0]?.count || 0,
          aiResponse: undefined, // Será carregado quando abrir o modal
          hasAiResponse: dbTask.ai_responses?.[0]?.count > 0
        }));
        setTasks(transformedTasks);
        setFilteredTasks(transformedTasks);
      } else {
        setTasks([]);
        setFilteredTasks([]);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      toast({
        title: "Erro ao carregar tarefas",
        description: "Não foi possível carregar as tarefas. Tente novamente.",
        variant: "destructive",
      });
      setTasks([]);
      setFilteredTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewTask = async (title: string, description: string, attachmentUrls: { filename: string; url: string; contentType: string; size: number }[]) => {
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
          title: "Tarefa criada com sucesso!",
          description: "Sua tarefa foi criada e será processada em breve.",
        });
        setShowNewTaskForm(false);
        loadTasks();
        
        // Processar automaticamente após criar
        setTimeout(() => {
          handleProcessTask(response.data.case.id);
        }, 1000);
      } else {
        throw new Error(response.data?.error || 'Erro ao criar tarefa');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast({
        title: "Erro ao criar tarefa",
        description: "Não foi possível criar a tarefa. Tente novamente.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleProcessTask = async (taskId: string) => {
    try {
      const response = await supabase.functions.invoke('process-case', {
        body: { caseId: taskId },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (response.data?.success) {
        toast({
          title: "Processamento iniciado",
          description: "A tarefa está sendo analisada pela IA.",
        });
        loadTasks();
      } else {
        throw new Error(response.data?.error || 'Erro ao processar tarefa');
      }
    } catch (error) {
      console.error('Error processing task:', error);
      toast({
        title: "Erro ao processar tarefa",
        description: "Não foi possível processar a tarefa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const handleViewTask = async (taskId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await supabase.functions.invoke('get-cases?caseId=' + taskId);

      if (response.data?.success && response.data.case) {
        const fullTask = response.data.case;
        const transformedTask: Task = {
          id: fullTask.id,
          title: fullTask.title,
          description: fullTask.description,
          status: fullTask.status === 'failed' ? 'error' : fullTask.status,
          createdAt: new Date(fullTask.created_at),
          attachmentsCount: fullTask.attachments?.length || 0,
          aiResponse: fullTask.ai_responses?.[0]?.response_text,
          hasAiResponse: (fullTask.ai_responses?.length || 0) > 0
        };
        setSelectedTask(transformedTask);
      } else {
        // Fallback para tarefa local se não conseguir carregar detalhes
        const task_ = tasks.find(t => t.id === taskId);
        if (task_) {
          setSelectedTask(task_);
        } else {
          throw new Error('Tarefa não encontrada');
        }
      }
    } catch (error) {
      console.error('Error loading task details:', error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar os detalhes da tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      // Atualizar a lista local
      setTasks(prev => prev.filter(t => t.id !== taskId));
      
      toast({
        title: "Tarefa excluída",
        description: "A tarefa foi removida com sucesso.",
      });
    } catch (error) {
      console.error('Error deleting task:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível remover a tarefa.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadTask = async (taskId: string) => {
    try {
      // Primeiro carregar os dados completos do caso
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('Usuário não autenticado');
      }

      const response = await supabase.functions.invoke('get-cases?caseId=' + taskId);

      let taskToDownload: Task;
      
      if (response.data?.success && response.data.case) {
        const fullTask = response.data.case;
        taskToDownload = {
          id: fullTask.id,
          title: fullTask.title,
          description: fullTask.description,
          status: fullTask.status === 'failed' ? 'error' : fullTask.status,
          createdAt: new Date(fullTask.created_at),
          attachmentsCount: fullTask.attachments?.length || 0,
          aiResponse: fullTask.ai_responses?.[0]?.response_text,
          hasAiResponse: (fullTask.ai_responses?.length || 0) > 0
        };
      } else {
        // Fallback para tarefa local
        const task_ = tasks.find(t => t.id === taskId);
        if (!task_) {
          throw new Error('Tarefa não encontrada');
        }
        taskToDownload = task_;
      }

      // Criar conteúdo do relatório
      const reportContent = `RELATÓRIO DE ANÁLISE - TAREFA ${taskToDownload.id}

=================================================
INFORMAÇÕES GERAIS
=================================================
Título: ${taskToDownload.title}
Descrição: ${taskToDownload.description}
Status: ${taskToDownload.status}
Data de Criação: ${taskToDownload.createdAt.toLocaleDateString('pt-BR')}
Anexos: ${taskToDownload.attachmentsCount} arquivo(s)

=================================================
ANÁLISE
=================================================
${taskToDownload.aiResponse || 'Análise ainda não disponível. A tarefa pode não ter sido processada pela IA ainda.'}

=================================================
Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
Sistema IARA - Assistente Virtual
=================================================`;

      // Criar e baixar arquivo
      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${taskToDownload.title.replace(/[^a-zA-Z0-9-_]/g, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Download concluído",
        description: "O relatório foi baixado com sucesso.",
      });
    } catch (error) {
      console.error('Error downloading task:', error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o relatório.",
        variant: "destructive",
      });
    }
  };

  const getStatusStats = () => {
    const pending = tasks.filter(t => t.status === "pending").length;
    const processing = tasks.filter(t => t.status === "processing").length;
    const completed = tasks.filter(t => t.status === "completed").length;
    const failed = tasks.filter(t => t.status === "error").length;
    return { pending, processing, completed, failed };
  };

  const stats = getStatusStats();

  if (showNewTaskForm) {
    return (
      <div className="min-h-screen bg-background">
        <Header user={user} onLogout={onLogout} onOpenProfile={() => setShowProfile(true)} />
        <main className="container mx-auto px-4 py-8">
          <NewTaskForm
            onSubmit={handleNewTask}
            onCancel={() => setShowNewTaskForm(false)}
          />
        </main>
      </div>
    );
  }

  if (loading) {
    return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} onOpenProfile={() => setShowProfile(true)} />
      <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando tarefas...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} onLogout={onLogout} onOpenProfile={() => setShowProfile(true)} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Header da página */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Minhas Tarefas
              </h1>
              <p className="text-muted-foreground">
                O que IARA pode ajudar você com hoje?
              </p>
            </div>
            <Button
              onClick={() => setShowNewTaskForm(true)}
              className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova Tarefa
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
                placeholder="Buscar tarefas..."
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

          {/* Lista de tarefas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task_) => (
              <TaskCard
                key={task_.id}
                task={task_}
                onProcessTask={handleProcessTask}
                onViewTask={handleViewTask}
                onDownloadTask={handleDownloadTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>

          {filteredTasks.length === 0 && !loading && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? "Nenhuma tarefa encontrada" : "Nenhuma tarefa criada"}
              </h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "Tente ajustar sua busca" : "Descreva sua primeira demanda para IARA começar"}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowNewTaskForm(true)}
                  className="bg-gradient-to-r from-primary to-primary-hover"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Primeira Tarefa
                </Button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Modal de detalhes */}
      {selectedTask && (
        <TaskDetailsModal
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
        />
      )}


      {/* Modal de perfil */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        user={user}
      />
    </div>
  );
}