import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Case } from "@/components/dashboard/CaseCard";
import { AttachmentViewer } from "@/components/attachments/AttachmentViewer";
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Download, 
  Calendar,
  Paperclip
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CaseDetailsModalProps {
  case: Case;
  onClose: () => void;
}

interface Attachment {
  id: string;
  filename: string;
  file_url: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

const statusConfig = {
  pending: {
    label: "Pendente",
    color: "bg-warning text-warning-foreground",
    icon: Clock,
    description: "Aguardando processamento"
  },
  processing: {
    label: "Processando",
    color: "bg-primary text-primary-foreground",
    icon: AlertCircle,
    description: "IA analisando documentos"
  },
  completed: {
    label: "Concluído",
    color: "bg-success text-success-foreground",
    icon: CheckCircle,
    description: "Análise finalizada"
  },
  error: {
    label: "Erro",
    color: "bg-destructive text-destructive-foreground",
    icon: AlertCircle,
    description: "Falha no processamento"
  },
};

export function CaseDetailsModal({ case: caseItem, onClose }: CaseDetailsModalProps) {
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  
  const status = statusConfig[caseItem.status];
  const StatusIcon = status.icon;

  useEffect(() => {
    const loadAttachments = async () => {
      setIsLoadingAttachments(true);
      try {
        const { data, error } = await supabase
          .from('attachments')
          .select('*')
          .eq('case_id', caseItem.id)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Erro ao carregar anexos:', error);
        } else {
          setAttachments(data || []);
        }
      } catch (error) {
        console.error('Erro ao carregar anexos:', error);
      } finally {
        setIsLoadingAttachments(false);
      }
    };

    loadAttachments();
  }, [caseItem.id]);

  return (
    <Dialog open={true} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <DialogTitle className="text-xl font-bold text-left">
                {caseItem.title}
              </DialogTitle>
              <DialogDescription className="text-left mt-2">
                {caseItem.description}
              </DialogDescription>
            </div>
            <Badge className={`${status.color} flex items-center gap-1 shrink-0`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6">
            {/* Informações básicas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Data de criação</span>
                </div>
                <p className="font-medium">
                  {format(caseItem.createdAt, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Paperclip className="h-4 w-4" />
                  <span>Anexos</span>
                </div>
                <p className="font-medium">
                  {caseItem.attachmentsCount} arquivo{caseItem.attachmentsCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            <Separator />

            {/* Anexos */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                Anexos ({attachments.length})
              </h3>
              {isLoadingAttachments ? (
                <div className="flex items-center justify-center p-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <span className="ml-2 text-muted-foreground">Carregando anexos...</span>
                </div>
              ) : (
                <AttachmentViewer 
                  attachments={attachments} 
                  showAnalysisStatus={caseItem.status === 'completed'} 
                />
              )}
            </div>

            <Separator />

            {/* Status detalhado */}
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Status do Processamento</h3>
              <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                <div className={`p-2 rounded-lg ${status.color.replace('text-', 'bg-').replace('-foreground', '/20')}`}>
                  <StatusIcon className={`h-5 w-5 ${status.color.split(' ')[1]}`} />
                </div>
                <div>
                  <p className="font-medium">{status.label}</p>
                  <p className="text-sm text-muted-foreground">{status.description}</p>
                </div>
              </div>
            </div>

            {/* Resposta da IA */}
            {caseItem.aiResponse && (
              <>
                <Separator />
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-success" />
                    Análise da IA
                  </h3>
                  
                  {/* Indicador de anexos analisados */}
                  {attachments.length > 0 && (
                    <div className="bg-gradient-to-r from-primary/5 to-primary/10 border border-primary/20 rounded-lg p-4 mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Anexos Processados pela IA</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        A IA analisou {attachments.filter(a => 
                          a.content_type.includes('text/') || 
                          a.content_type.includes('application/json')
                        ).length} de {attachments.length} anexos automaticamente. 
                        {attachments.some(a => 
                          a.content_type.includes('application/pdf') || 
                          a.content_type.includes('image/')
                        ) && ' Arquivos PDF e imagens foram referenciados na análise.'}
                      </p>
                    </div>
                  )}
                  
                  <div className="bg-gradient-to-br from-success/5 to-success/10 border border-success/20 rounded-lg p-6">
                    <div className="prose max-w-none">
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">
                        {caseItem.aiResponse}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Timeline (placeholder) */}
            <Separator />
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Timeline</h3>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
                  <div>
                    <p className="font-medium text-sm">Caso criado</p>
                    <p className="text-xs text-muted-foreground">
                      {format(caseItem.createdAt, "dd/MM/yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                
                {caseItem.status !== "pending" && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Processamento iniciado</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(caseItem.createdAt.getTime() + 2000), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
                
                {caseItem.status === "completed" && (
                  <div className="flex gap-3">
                    <div className="w-2 h-2 bg-success rounded-full mt-2"></div>
                    <div>
                      <p className="font-medium text-sm">Análise concluída</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(caseItem.createdAt.getTime() + 8000), "dd/MM/yyyy HH:mm")}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Ações */}
        <div className="flex gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Fechar
          </Button>
          {caseItem.status === "completed" && (
            <Button 
              className="flex-1 bg-gradient-to-r from-primary to-primary-hover"
              onClick={() => {
                // Criar conteúdo do relatório
                const reportContent = `RELATÓRIO DE ANÁLISE - CASO ${caseItem.id}

=================================================
INFORMAÇÕES GERAIS
=================================================
Título: ${caseItem.title}
Descrição: ${caseItem.description}
Status: ${caseItem.status}
Data de Criação: ${caseItem.createdAt.toLocaleDateString('pt-BR')}
Anexos: ${caseItem.attachmentsCount} arquivo(s)

=================================================
ANÁLISE DA IA
=================================================
${caseItem.aiResponse || 'Análise ainda não disponível.'}

=================================================
Relatório gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
Sistema IARA - Análise Inteligente de Casos
=================================================`;

                // Criar e baixar arquivo
                const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `relatorio-caso-${caseItem.id.slice(0, 8)}.txt`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              }}
            >
              <Download className="mr-2 h-4 w-4" />
              Baixar Relatório
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}