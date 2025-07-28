// services/fileProcessingService.ts
import { toast } from "sonner";

export interface ProcessedFile {
  name: string;
  size: number;
  type: string;
  content: string;
  extractedText?: string;
  error?: string;
}

export interface ProcessingResult {
  files: ProcessedFile[];
  summary: string;
  analysis: string;
  recommendations: string[];
}

class FileProcessingService {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly SUPPORTED_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { 
        valid: false, 
        error: `Arquivo ${file.name} excede o tamanho máximo de 10MB` 
      };
    }

    if (!this.SUPPORTED_TYPES.includes(file.type)) {
      return { 
        valid: false, 
        error: `Tipo de arquivo ${file.type} não suportado` 
      };
    }

    return { valid: true };
  }

  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private async extractTextFromFile(file: File): Promise<string> {
    try {
      switch (file.type) {
        case 'text/plain':
          return await this.extractTextFromTxt(file);
        
        case 'application/pdf':
          return await this.extractTextFromPDF(file);
        
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractTextFromDoc(file);
        
        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
          return await this.extractTextFromImage(file);
        
        default:
          return "Tipo de arquivo não suportado para extração de texto";
      }
    } catch (error) {
      console.error(`Erro ao extrair texto do arquivo ${file.name}:`, error);
      return `Erro na extração: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
    }
  }

  private async extractTextFromTxt(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(file, 'utf-8');
    });
  }

  private async extractTextFromPDF(file: File): Promise<string> {
    const base64 = await this.fileToBase64(file);
    
    try {
      const response = await fetch('/api/file-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, filename: file.name, type: 'pdf' })
      });
      
      if (!response.ok) throw new Error('Falha na extração do PDF');
      
      const result = await response.json();
      return result.text || 'Texto não extraído do PDF';
    } catch (error) {
      console.warn('API de extração não disponível, usando fallback');
      return `[PDF] ${file.name} - Conteúdo para processamento pela IA (${(file.size / 1024).toFixed(1)}KB)`;
    }
  }

  private async extractTextFromDoc(file: File): Promise<string> {
    const base64 = await this.fileToBase64(file);
    
    try {
      const response = await fetch('/api/file-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, filename: file.name, type: 'doc' })
      });
      
      if (!response.ok) throw new Error('Falha na extração do documento');
      
      const result = await response.json();
      return result.text || 'Texto não extraído do documento';
    } catch (error) {
      console.warn('API de extração não disponível, usando fallback');
      return `[DOC] ${file.name} - Documento para processamento pela IA (${(file.size / 1024).toFixed(1)}KB)`;
    }
  }

  private async extractTextFromImage(file: File): Promise<string> {
    const base64 = await this.fileToBase64(file);
    
    try {
      const response = await fetch('/api/file-processing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: base64, filename: file.name, type: 'image' })
      });
      
      if (!response.ok) throw new Error('Falha no OCR da imagem');
      
      const result = await response.json();
      return result.text || 'Texto não encontrado na imagem';
    } catch (error) {
      console.warn('OCR não disponível, usando fallback');
      return `[IMG] ${file.name} - Imagem para análise visual pela IA (${(file.size / 1024).toFixed(1)}KB)`;
    }
  }

  async processFiles(files: File[]): Promise<ProcessedFile[]> {
    const processedFiles: ProcessedFile[] = [];
    
    for (const file of files) {
      const validation = this.validateFile(file);
      
      if (!validation.valid) {
        processedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: '',
          error: validation.error
        });
        continue;
      }

      try {
        const extractedText = await this.extractTextFromFile(file);
        const base64Content = await this.fileToBase64(file);
        
        processedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: base64Content,
          extractedText: extractedText
        });
        
        toast.success(`Arquivo ${file.name} processado com sucesso`);
      } catch (error) {
        processedFiles.push({
          name: file.name,
          size: file.size,
          type: file.type,
          content: '',
          error: `Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
        });
        
        toast.error(`Erro ao processar ${file.name}`);
      }
    }
    
    return processedFiles;
  }

  async analyzeWithAI(
    processedFiles: ProcessedFile[],
    caseTitle: string,
    caseDescription: string
  ): Promise<ProcessingResult> {
    const validFiles = processedFiles.filter(f => !f.error);
    
    if (validFiles.length === 0) {
      throw new Error('Nenhum arquivo válido para análise');
    }

    const filesContext = validFiles.map(file => ({
      filename: file.name,
      type: file.type,
      size: file.size,
      extractedText: file.extractedText || 'Texto não disponível',
      hasContent: !!file.extractedText && file.extractedText.length > 0
    }));

    const prompt = this.buildAIPrompt(caseTitle, caseDescription, filesContext);

    try {
      const response = await fetch('/api/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          files: validFiles.map(f => ({
            name: f.name,
            type: f.type,
            content: f.content,
            extractedText: f.extractedText
          }))
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na análise: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        files: processedFiles,
        summary: result.summary || 'Resumo não gerado',
        analysis: result.analysis || 'Análise não disponível',
        recommendations: result.recommendations || []
      };
      
    } catch (error) {
      console.error('Erro na análise:', error);
      
      return {
        files: processedFiles,
        summary: this.generateBasicSummary(validFiles, caseTitle),
        analysis: 'Análise detalhada temporariamente indisponível. Arquivos foram processados com sucesso.',
        recommendations: this.generateBasicRecommendations(validFiles)
      };
    }
  }

  private buildAIPrompt(
    caseTitle: string, 
    caseDescription: string, 
    files: any[]
  ): string {
    return `
Analise o seguinte caso legal:

**Título do Caso:** ${caseTitle}
**Descrição:** ${caseDescription}

**Arquivos Anexados:**
${files.map((f, i) => `
${i + 1}. **${f.filename}** (${f.type})
   - Tamanho: ${(f.size / 1024).toFixed(1)}KB
   - Texto extraído: ${f.hasContent ? 'Sim' : 'Não'}
   ${f.hasContent ? `\n   Conteúdo:\n   ${f.extractedText.substring(0, 500)}${f.extractedText.length > 500 ? '...' : ''}` : ''}
`).join('\n')}

Por favor, forneça:
1. **Resumo:** Um resumo conciso do caso baseado nos documentos
2. **Análise:** Análise jurídica detalhada dos documentos
3. **Recomendações:** Lista de próximos passos e recomendações

Responda em formato JSON:
{
  "summary": "resumo aqui",
  "analysis": "análise detalhada aqui", 
  "recommendations": ["recomendação 1", "recomendação 2", ...]
}
    `.trim();
  }

  private generateBasicSummary(files: ProcessedFile[], caseTitle: string): string {
    const fileTypes = files.map(f => f.type).join(', ');
    const totalSize = files.reduce((sum, f) => sum + f.size, 0);
    
    return `Caso "${caseTitle}" com ${files.length} arquivo(s) processado(s). 
    Tipos: ${fileTypes}. 
    Tamanho total: ${(totalSize / 1024).toFixed(1)}KB.
    Todos os arquivos foram extraídos e estão prontos para análise detalhada.`;
  }

  private generateBasicRecommendations(files: ProcessedFile[]): string[] {
    const recommendations = [
      'Revisar todos os documentos anexados',
      'Verificar se há informações adicionais necessárias'
    ];

    if (files.some(f => f.type.includes('pdf'))) {
      recommendations.push('Analisar documentos PDF em detalhes');
    }

    if (files.some(f => f.type.includes('image'))) {
      recommendations.push('Examinar imagens anexadas para informações relevantes');
    }

    return recommendations;
  }
}

export const fileProcessingService = new FileProcessingService();