import React, { useState, useCallback } from 'react';
import { Upload, File, X, CheckCircle, AlertCircle, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { fileProcessingService, ProcessedFile, ProcessingResult } from '@/services/fileProcessingService';

interface EnhancedFileUploadProps {
  onFilesProcessed: (result: ProcessingResult) => void;
  caseTitle: string;
  caseDescription: string;
  maxFiles?: number;
  disabled?: boolean;
}

interface FileWithStatus extends File {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  extractedText?: string;
  error?: string;
}

export const EnhancedFileUpload: React.FC<EnhancedFileUploadProps> = ({
  onFilesProcessed,
  caseTitle,
  caseDescription,
  maxFiles = 5,
  disabled = false
}) => {
  const [files, setFiles] = useState<FileWithStatus[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const generateId = () => Math.random().toString(36).substr(2, 9);

  const createFileWithStatus = (file: File): FileWithStatus => ({
    ...file,
    id: generateId(),
    status: 'pending',
    progress: 0
  });

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFileSelection(droppedFiles);
  }, [disabled]);

  const handleFileSelection = (selectedFiles: File[]) => {
    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} arquivos permitidos`);
      return;
    }

    const newFiles = selectedFiles.map(createFileWithStatus);
    setFiles(prev => [...prev, ...newFiles]);
    
    toast.success(`${selectedFiles.length} arquivo(s) adicionado(s)`);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFileSelection(Array.from(e.target.files));
    }
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(file => file.id !== id));
  };

  const processFiles = async () => {
    if (files.length === 0) {
      toast.warning('Selecione pelo menos um arquivo');
      return;
    }

    if (!caseTitle.trim() || !caseDescription.trim()) {
      toast.error('Título e descrição do caso são obrigatórios');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      setFiles(prev => prev.map(file => ({ 
        ...file, 
        status: 'processing' as const,
        progress: 0 
      })));

      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const processedFiles = await fileProcessingService.processFiles(files as File[]);
      
      setFiles(prev => prev.map(file => {
        const processed = processedFiles.find(p => p.name === file.name);
        return {
          ...file,
          status: processed?.error ? 'error' as const : 'completed' as const,
          progress: 100,
          extractedText: processed?.extractedText,
          error: processed?.error
        };
      }));

      setProcessingProgress(95);

      const result = await fileProcessingService.analyzeWithAI(
        processedFiles,
        caseTitle,
        caseDescription
      );

      setProcessingProgress(100);
      
      onFilesProcessed(result);
      
      toast.success(`${processedFiles.length} arquivo(s) processado(s) com sucesso!`);
      
    } catch (error) {
      console.error('Erro no processamento:', error);
      toast.error(`Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      setFiles(prev => prev.map(file => ({ 
        ...file, 
        status: 'error' as const,
        error: 'Falha no processamento'
      })));
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingProgress(0), 2000);
    }
  };

  const TextPreviewDialog = ({ file }: { file: FileWithStatus }) => (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          disabled={!file.extractedText}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Texto Extraído - {file.name}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-96 w-full p-4">
          <pre className="text-sm whitespace-pre-wrap">
            {file.extractedText || 'Nenhum texto extraído'}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  const getStatusIcon = (file: FileWithStatus) => {
    switch (file.status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <File className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (file: FileWithStatus) => {
    switch (file.status) {
      case 'processing':
        return <Badge variant="secondary">Processando...</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800">Concluído</Badge>;
      case 'error':
        return <Badge variant="destructive">Erro</Badge>;
      default:
        return <Badge variant="outline">Pendente</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <Card 
        className={`border-2 border-dashed transition-colors ${
          isDragging 
            ? 'border-primary bg-primary/5' 
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <CardContent className="p-8 text-center">
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <div className="space-y-2">
            <p className="text-lg font-medium">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-sm text-gray-500">
              Suporte: PDF, DOC, DOCX, TXT, JPG, PNG (máx. 10MB cada)
            </p>
            <p className="text-xs text-gray-400">
              Máximo {maxFiles} arquivos
            </p>
          </div>
          
          <input
            type="file"
            multiple
            disabled={disabled}
            onChange={handleInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
          />
        </CardContent>
      </Card>

      {isProcessing && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Processando arquivos...</span>
            <span>{processingProgress}%</span>
          </div>
          <Progress value={processingProgress} className="w-full" />
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium">Arquivos Selecionados ({files.length}/{maxFiles})</h4>
          
          {files.map((file) => (
            <Card key={file.id} className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1">
                  {getStatusIcon(file)}
                  
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(file)}
                    
                    {file.extractedText && (
                      <TextPreviewDialog file={file} />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(file.id)}
                      disabled={isProcessing}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {file.status === 'processing' && (
                <Progress value={file.progress} className="mt-2" />
              )}
            </Card>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <Button 
          onClick={processFiles} 
          disabled={isProcessing || disabled || files.length === 0}
          className="w-full"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando com IA...
            </>
          ) : (
            `Processar ${files.length} Arquivo(s) com IA`
          )}
        </Button>
      )}
    </div>
  );
}; 
