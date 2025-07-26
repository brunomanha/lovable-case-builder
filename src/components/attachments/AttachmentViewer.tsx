import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, 
  Image, 
  File, 
  Download, 
  Eye,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Attachment {
  id: string;
  filename: string;
  file_url: string;
  content_type: string;
  file_size: number;
  created_at: string;
}

interface AttachmentViewerProps {
  attachments: Attachment[];
  showAnalysisStatus?: boolean;
}

export function AttachmentViewer({ attachments, showAnalysisStatus = false }: AttachmentViewerProps) {
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [previewContent, setPreviewContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const getFileIcon = (contentType: string) => {
    if (contentType.includes('text/') || contentType.includes('application/json')) {
      return <FileText className="h-5 w-5" />;
    }
    if (contentType.includes('image/')) {
      return <Image className="h-5 w-5" />;
    }
    return <File className="h-5 w-5" />;
  };

  const getFileTypeLabel = (contentType: string) => {
    if (contentType.includes('text/plain')) return 'Texto';
    if (contentType.includes('text/csv')) return 'CSV';
    if (contentType.includes('application/json')) return 'JSON';
    if (contentType.includes('application/pdf')) return 'PDF';
    if (contentType.includes('image/')) return 'Imagem';
    if (contentType.includes('application/msword')) return 'Word';
    if (contentType.includes('application/vnd.ms-excel')) return 'Excel';
    return 'Arquivo';
  };

  const canPreview = (contentType: string) => {
    return contentType.includes('text/') || 
           contentType.includes('application/json') ||
           contentType.includes('image/');
  };

  const getAnalysisStatus = (contentType: string) => {
    if (contentType.includes('text/') || contentType.includes('application/json')) {
      return {
        status: 'analyzed',
        icon: CheckCircle,
        text: 'Analisado pela IA',
        color: 'text-success'
      };
    }
    if (contentType.includes('image/') || contentType.includes('application/pdf')) {
      return {
        status: 'referenced',
        icon: AlertCircle,
        text: 'Referenciado na análise',
        color: 'text-warning'
      };
    }
    return {
      status: 'not-analyzed',
      icon: AlertCircle,
      text: 'Não analisado automaticamente',
      color: 'text-muted-foreground'
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePreview = async (attachment: Attachment) => {
    if (!canPreview(attachment.content_type)) return;

    setIsLoading(true);
    setSelectedAttachment(attachment);

    try {
      if (attachment.content_type.includes('image/')) {
        setPreviewContent('');
      } else {
        // Para arquivos de texto, baixar o conteúdo
        const response = await fetch(attachment.file_url);
        if (response.ok) {
          const content = await response.text();
          setPreviewContent(content);
        } else {
          setPreviewContent('Erro ao carregar conteúdo do arquivo.');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar preview:', error);
      setPreviewContent('Erro ao carregar conteúdo do arquivo.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    try {
      const response = await fetch(attachment.file_url);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachment.filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
    }
  };

  if (!attachments || attachments.length === 0) {
    return (
      <div className="text-center p-6 bg-muted/30 rounded-lg">
        <File className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Nenhum anexo encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {attachments.map((attachment) => {
          const analysisStatus = getAnalysisStatus(attachment.content_type);
          const StatusIcon = analysisStatus.icon;

          return (
            <Card key={attachment.id} className="p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="p-2 bg-muted rounded-lg">
                    {getFileIcon(attachment.content_type)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{attachment.filename}</h4>
                      <Badge variant="secondary" className="text-xs">
                        {getFileTypeLabel(attachment.content_type)}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>{formatFileSize(attachment.file_size)}</span>
                      {showAnalysisStatus && (
                        <>
                          <span>•</span>
                          <div className={`flex items-center gap-1 ${analysisStatus.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            <span>{analysisStatus.text}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {canPreview(attachment.content_type) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handlePreview(attachment)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Visualizar
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(attachment)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Baixar
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Modal de Preview */}
      {selectedAttachment && (
        <Dialog open={true} onOpenChange={() => setSelectedAttachment(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {getFileIcon(selectedAttachment.content_type)}
                {selectedAttachment.filename}
              </DialogTitle>
            </DialogHeader>

            <ScrollArea className="max-h-[70vh]">
              {isLoading ? (
                <div className="flex items-center justify-center p-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : selectedAttachment.content_type.includes('image/') ? (
                <div className="flex justify-center p-4">
                  <img
                    src={selectedAttachment.file_url}
                    alt={selectedAttachment.filename}
                    className="max-w-full max-h-[60vh] object-contain rounded-lg"
                  />
                </div>
              ) : (
                <div className="p-4">
                  <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg overflow-auto">
                    {previewContent}
                  </pre>
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setSelectedAttachment(null)}
              >
                Fechar
              </Button>
              <Button
                onClick={() => handleDownload(selectedAttachment)}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Arquivo
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}