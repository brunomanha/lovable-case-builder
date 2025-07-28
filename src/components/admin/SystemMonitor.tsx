import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Search, 
  Clock, 
  User, 
  FileText, 
  Zap, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Calendar,
  Activity,
  Bot
} from "lucide-react";

interface ProcessingLog {
  id: string;
  case_id: string;
  user_id: string;
  status: string;
  processing_time: number | null;
  created_at: string;
  updated_at: string;
  model_used: string | null;
  ai_response: string | null;
  error_code: string | null;
  error_message: string | null;
  // Dados relacionados
  case_title: string;
  case_description: string;
  user_name: string;
  user_email: string;
  ai_response_text?: string;
  response_confidence?: number;
}

const SystemMonitor = () => {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ProcessingLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const { toast } = useToast();

  useEffect(() => {
    loadProcessingLogs();
  }, []);

  useEffect(() => {
    filterLogs();
  }, [logs, searchTerm, statusFilter]);

  const loadProcessingLogs = async () => {
    try {
      // Buscar logs de processamento
      const { data: logsData, error } = await supabase
        .from('ai_processing_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      // Enriquecer cada log com dados relacionados
      const enrichedLogs = await Promise.all(
        logsData?.map(async (log) => {
          // Buscar dados do caso
          const { data: caseData } = await supabase
            .from('cases')
            .select('title, description, user_id')
            .eq('id', log.case_id)
            .maybeSingle();

          // Buscar dados do usuário
          const { data: userData } = await supabase
            .from('profiles')
            .select('display_name, email')
            .eq('user_id', caseData?.user_id || log.user_id)
            .maybeSingle();

          // Buscar resposta da IA
          const { data: aiResponse } = await supabase
            .from('ai_responses')
            .select('response_text, confidence_score')
            .eq('case_id', log.case_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...log,
            case_title: caseData?.title || 'Caso não encontrado',
            case_description: caseData?.description || '',
            user_name: userData?.display_name || 'Usuário não encontrado',
            user_email: userData?.email || '',
            ai_response_text: aiResponse?.response_text || null,
            response_confidence: aiResponse?.confidence_score || null,
          };
        }) || []
      );

      setLogs(enrichedLogs);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar logs do sistema.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterLogs = () => {
    let filtered = logs;

    // Filtro por texto
    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.case_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.model_used?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por status
    if (statusFilter !== "all") {
      filtered = filtered.filter(log => log.status === statusFilter);
    }

    setFilteredLogs(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Concluído</Badge>;
      case 'processing':
        return <Badge variant="secondary"><RefreshCw className="h-3 w-3 mr-1 animate-spin" />Processando</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Falhou</Badge>;
      case 'pending':
        return <Badge variant="outline"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>;
      default:
        return <Badge variant="secondary"><AlertCircle className="h-3 w-3 mr-1" />{status}</Badge>;
    }
  };

  const formatDuration = (ms: number | null) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header e controles */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Monitor do Sistema</h2>
          <p className="text-muted-foreground">
            Acompanhe todos os processamentos e interações com IA em tempo real
          </p>
        </div>
        <Button onClick={loadProcessingLogs} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Estatísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Logs</p>
                <p className="text-xl font-bold">{logs.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Concluídos</p>
                <p className="text-xl font-bold">{logs.filter(l => l.status === 'completed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Falhas</p>
                <p className="text-xl font-bold">{logs.filter(l => l.status === 'failed').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-xl font-bold">
                  {formatDuration(
                    logs.filter(l => l.processing_time).reduce((acc, l) => acc + (l.processing_time || 0), 0) / 
                    logs.filter(l => l.processing_time).length || 0
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="search">Buscar</Label>
              <Input
                id="search"
                placeholder="Buscar por usuário, caso ou modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                className="w-full p-2 border rounded-md"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">Todos os status</option>
                <option value="completed">Concluído</option>
                <option value="processing">Processando</option>
                <option value="failed">Falhou</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de logs */}
      <Card>
        <CardHeader>
          <CardTitle>Logs de Processamento</CardTitle>
          <CardDescription>
            {filteredLogs.length} de {logs.length} logs exibidos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {filteredLogs.map((log) => (
                <Card key={log.id} className="p-4">
                  <div className="space-y-3">
                    {/* Header do log */}
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(log.status)}
                        <Badge variant="outline">
                          <Calendar className="h-3 w-3 mr-1" />
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </Badge>
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <p>Tempo: {formatDuration(log.processing_time)}</p>
                        <p>ID: {log.id.slice(0, 8)}...</p>
                      </div>
                    </div>

                    {/* Informações do usuário e caso */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-start gap-2">
                        <User className="h-4 w-4 mt-1 text-blue-500" />
                        <div>
                          <p className="font-medium">{log.user_name}</p>
                          <p className="text-sm text-muted-foreground">{log.user_email}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 mt-1 text-green-500" />
                        <div>
                          <p className="font-medium">{log.case_title}</p>
                          <p className="text-sm text-muted-foreground line-clamp-2">{log.case_description}</p>
                        </div>
                      </div>
                    </div>

                    {/* Detalhes técnicos */}
                    {log.model_used && (
                      <div className="flex items-center gap-2">
                        <Bot className="h-4 w-4 text-purple-500" />
                        <span className="text-sm">Modelo: <code className="bg-muted px-1 rounded">{log.model_used}</code></span>
                        {log.response_confidence && (
                          <span className="text-sm">Confiança: {(log.response_confidence * 100).toFixed(1)}%</span>
                        )}
                      </div>
                    )}

                    {/* Erro, se houver */}
                    {log.status === 'failed' && log.error_message && (
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="flex items-center gap-2 text-red-700">
                          <XCircle className="h-4 w-4" />
                          <span className="font-medium">Erro:</span>
                        </div>
                        <p className="text-sm text-red-600 mt-1">{log.error_message}</p>
                        {log.error_code && (
                          <p className="text-xs text-red-500 mt-1">Código: {log.error_code}</p>
                        )}
                      </div>
                    )}

                    {/* Resposta da IA (prévia) */}
                    {log.ai_response_text && (
                      <div className="bg-blue-50 border border-blue-200 rounded p-3">
                        <div className="flex items-center gap-2 text-blue-700 mb-2">
                          <Bot className="h-4 w-4" />
                          <span className="font-medium">Resposta da IA:</span>
                        </div>
                        <p className="text-sm text-blue-800 line-clamp-3">{log.ai_response_text}</p>
                      </div>
                    )}
                  </div>
                </Card>
              ))}

              {filteredLogs.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhum log encontrado com os filtros aplicados.</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMonitor;