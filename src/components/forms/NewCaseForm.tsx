import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, FileText, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface NewCaseFormProps {
  onSubmit: (title: string, description: string, attachmentUrls: { filename: string; url: string; contentType: string; size: number }[]) => Promise<void>;
  onCancel: () => void;
}

export function NewCaseForm({ onSubmit, onCancel }: NewCaseFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const validateAndAddFiles = (fileList: File[]) => {
    // Validação de tamanho (50MB por arquivo)
    const maxSize = 50 * 1024 * 1024; // 50MB
    const invalidFiles = fileList.filter(file => file.size > maxSize);
    
    if (invalidFiles.length > 0) {
      toast({
        title: "Arquivos muito grandes",
        description: `${invalidFiles.length} arquivo(s) excedem o limite de 50MB.`,
        variant: "destructive",
      });
      return;
    }

    // Validação de extensões permitidas
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png', '.gif', '.csv', '.json'];
    const invalidExtensions = fileList.filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return !allowedExtensions.includes(extension);
    });

    if (invalidExtensions.length > 0) {
      toast({
        title: "Tipo de arquivo não permitido",
        description: "Apenas arquivos PDF, DOC, DOCX, TXT, CSV, JSON e imagens são aceitos.",
        variant: "destructive",
      });
      return;
    }

    setFiles(prev => [...prev, ...fileList]);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    validateAndAddFiles(selectedFiles);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFilesDrop = (droppedFiles: File[]) => {
    validateAndAddFiles(droppedFiles);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const uploadFilesToSupabase = async (files: File[]) => {
    const uploadedFiles = [];
    
    for (const file of files) {
      try {
        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const randomId = Math.random().toString(36).substr(2, 9);
        const fileExtension = file.name.split('.').pop();
        const filename = `${timestamp}_${randomId}.${fileExtension}`;
        
        // Upload para o bucket do Supabase
        const { data, error } = await supabase.storage
          .from('case-attachments')
          .upload(filename, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          throw error;
        }

        // Obter URL pública do arquivo
        const { data: { publicUrl } } = supabase.storage
          .from('case-attachments')
          .getPublicUrl(filename);

        uploadedFiles.push({
          filename: file.name,
          url: publicUrl,
          contentType: file.type,
          size: file.size
        });
      } catch (error) {
        console.error(`Erro ao fazer upload do arquivo ${file.name}:`, error);
        throw new Error(`Falha no upload do arquivo ${file.name}`);
      }
    }
    
    return uploadedFiles;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Input validation and sanitization
    const sanitizedTitle = title.trim();
    const sanitizedDescription = description.trim();
    
    if (!sanitizedTitle || !sanitizedDescription) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha título e descrição.",
        variant: "destructive",
      });
      return;
    }

    if (sanitizedTitle.length < 3 || sanitizedTitle.length > 200) {
      toast({
        title: "Título inválido",
        description: "O título deve ter entre 3 e 200 caracteres.",
        variant: "destructive",
      });
      return;
    }

    if (sanitizedDescription.length < 10 || sanitizedDescription.length > 5000) {
      toast({
        title: "Descrição inválida",
        description: "A descrição deve ter entre 10 e 5000 caracteres.",
        variant: "destructive",
      });
      return;
    }

    // Validate file attachments
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    
    for (const file of files) {
      if (file.size > maxFileSize) {
        toast({
          title: "Arquivo muito grande",
          description: `O arquivo ${file.name} é muito grande. Máximo: 50MB.`,
          variant: "destructive",
        });
        return;
      }
    }

    setIsLoading(true);
    try {
      // Upload dos arquivos para o Supabase Storage
      const uploadedFiles = await uploadFilesToSupabase(files);
      
      // Enviar dados do caso com URLs dos arquivos
      await onSubmit(sanitizedTitle, sanitizedDescription, uploadedFiles);
      
      toast({
        title: "Caso criado com sucesso!",
        description: "Seu caso foi enviado para análise.",
      });
    } catch (error) {
      console.error("Error submitting case:", error);
      toast({
        title: "Erro ao criar caso",
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl border-0 bg-card">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-primary-light bg-clip-text text-transparent">
          Novo Caso para Análise
        </CardTitle>
        <CardDescription>
          Preencha as informações e anexe os arquivos para análise pela IA
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Título do Caso *
            </Label>
            <Input
              id="title"
              placeholder="Ex: Análise de contrato de prestação de serviços"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-12"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Descrição do Caso *
            </Label>
            <Textarea
              id="description"
              placeholder="Descreva detalhadamente o que você gostaria que a IA analise nos documentos..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[120px] resize-none"
              disabled={isLoading}
            />
          </div>

          <div className="space-y-4">
            <Label className="text-sm font-medium">
              Anexos (opcional - máx. 50MB por arquivo)
            </Label>
            
            <div
              className="border-2 border-dashed border-border hover:border-primary/50 rounded-lg p-8 text-center cursor-pointer transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.add('border-primary', 'bg-primary/5');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.classList.remove('border-primary', 'bg-primary/5');
                
                const droppedFiles = Array.from(e.dataTransfer.files);
                if (droppedFiles.length > 0) {
                  handleFilesDrop(droppedFiles);
                }
              }}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Clique para selecionar arquivos ou arraste e solte aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                PDF, DOC, DOCX, TXT, CSV, JSON, JPG, PNG, GIF
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.txt,.csv,.json,.jpg,.jpeg,.png,.gif"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isLoading}
            />

            {files.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Arquivos Selecionados ({files.length})
                </Label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {files.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-muted rounded-lg"
                    >
                      <FileText className="h-4 w-4 text-primary" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-primary to-primary-hover"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Enviar para Análise
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}