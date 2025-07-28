import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, CheckCircle, Clock, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProcessingLog {
  id: string;
  case_id: string;
  status: 'processing' | 'completed' | 'error';
  error_message?: string;
  error_code?: string;
  model_used?: string;
  processing_time?: number;
  created_at: string;
  cases?: {
    title: string;
  };
}

export function ProcessingLogsViewer() {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_processing_logs')
        .select(`
          *,
          cases(title)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs((data || []).filter(log => log.cases).map(log => ({
        ...log,
        status: log.status as 'processing' | 'completed' | 'error',
        cases: Array.isArray(log.cases) ? log.cases[0] : log.cases
      })));
    } catch (error: any) {
      toast.error('Erro ao carregar logs: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Atualizar a cada 30 segundos
    const interval = setInterval(fetchLogs, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      processing: "secondary",
      completed: "default",
      error: "destructive"
    };

    const labels = {
      processing: "Processando",
      completed: "Concluído",
      error: "Erro"
    };

    return (
      <Badge variant={variants[status] || "default"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Carregando logs...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Logs de Processamento da IA
            </CardTitle>
            <CardDescription>
              Acompanhe o status e erros dos processamentos realizados pela IA
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum log de processamento encontrado
          </div>
        ) : (
          <ScrollArea className="h-[600px]">
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 border rounded-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span className="font-medium">
                        {log.cases?.title || 'Caso sem título'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(log.status)}
                      <span className="text-sm text-muted-foreground">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  {log.model_used && (
                    <div className="text-sm">
                      <strong>Modelo:</strong> {log.model_used}
                    </div>
                  )}

                  {log.processing_time && (
                    <div className="text-sm">
                      <strong>Tempo de processamento:</strong> {log.processing_time}ms
                    </div>
                  )}

                  {log.error_message && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded text-sm">
                      <div className="font-medium text-red-800 mb-1">
                        Erro detectado:
                      </div>
                      <div className="text-red-700">
                        {log.error_message}
                      </div>
                      {log.error_code && (
                        <div className="text-red-600 mt-1">
                          <strong>Código:</strong> {log.error_code}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}