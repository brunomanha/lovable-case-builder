import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessingLog {
  id: string;
  status: 'processing' | 'completed' | 'error';
  error_message?: string;
  ai_response?: string;
  model_used?: string;
  processing_time?: number;
  created_at: string;
}

interface ProcessingLogsDisplayProps {
  caseId: string;
}

export function ProcessingLogsDisplay({ caseId }: ProcessingLogsDisplayProps) {
  const [logs, setLogs] = useState<ProcessingLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('ai_processing_logs')
        .select('*')
        .eq('case_id', caseId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Erro ao carregar logs:', error);
        return;
      }

      const processedLogs: ProcessingLog[] = (data || []).map(log => ({
        id: log.id,
        status: log.status as 'processing' | 'completed' | 'error',
        error_message: log.error_message,
        ai_response: log.ai_response,
        model_used: log.model_used,
        processing_time: log.processing_time,
        created_at: log.created_at
      }));

      setLogs(processedLogs);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
    
    // Atualizar logs a cada 5 segundos se estiver processando
    const interval = setInterval(() => {
      const hasProcessingLogs = logs.some(log => log.status === 'processing');
      if (hasProcessingLogs) {
        fetchLogs();
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [caseId, logs]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Clock className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'error':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const config = {
      processing: { variant: "secondary" as const, label: "Processando" },
      completed: { variant: "default" as const, label: "Concluído" },
      error: { variant: "destructive" as const, label: "Erro" }
    };

    const { variant, label } = config[status as keyof typeof config] || config.processing;

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {label}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        <span className="ml-2 text-muted-foreground">Carregando logs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Log do Processamento
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLogs}
          className="h-8 px-3"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>

      {logs.length === 0 ? (
        <div className="text-center p-6 text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum log de processamento encontrado</p>
        </div>
      ) : (
        <ScrollArea className="h-64 border rounded-lg p-3">
          <div className="space-y-3">
            {logs.map((log) => (
              <div
                key={log.id}
                className="border rounded-lg p-3 space-y-2 bg-card"
              >
                <div className="flex items-center justify-between">
                  {getStatusBadge(log.status)}
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </span>
                </div>

                {log.model_used && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Modelo:</strong> {log.model_used}
                  </div>
                )}

                {log.processing_time && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Tempo de processamento:</strong> {log.processing_time}ms
                  </div>
                )}

                {log.error_message && (
                  <div className="text-sm text-destructive bg-destructive/10 p-2 rounded border-l-2 border-destructive">
                    <strong>Erro:</strong> {log.error_message}
                  </div>
                )}

                {log.ai_response && (
                  <div className="text-sm bg-success/10 p-2 rounded border-l-2 border-success">
                    <strong>Resposta da IA:</strong>
                    <div className="mt-1 text-xs whitespace-pre-wrap max-h-32 overflow-y-auto">
                      {log.ai_response.length > 200 
                        ? `${log.ai_response.substring(0, 200)}...` 
                        : log.ai_response
                      }
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}