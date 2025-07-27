import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  FileText, 
  Brain, 
  CheckCircle, 
  Download, 
  Share2, 
  Clock,
  AlertTriangle,
  Lightbulb
} from 'lucide-react';
import { ProcessingResult } from '@/services/fileProcessingService';

interface AIAnalysisResultsProps {
  result: ProcessingResult;
  caseTitle: string;
  caseDescription: string;
  onExport?: () => void;
  onShare?: () => void;
}

export const AIAnalysisResults: React.FC<AIAnalysisResultsProps> = ({
  result,
  caseTitle,
  caseDescription,
  onExport,
  onShare
}) => {
  const successfulFiles = result.files.filter(f => !f.error);
  const failedFiles = result.files.filter(f => f.error);

  const formatFileSize = (bytes: number) => {
    return (bytes / 1024).toFixed(1) + ' KB';
  };

  const getFileTypeIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('image')) return '🖼️';
    if (type.includes('text')) return '📃';
    return '📁';
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-blue-600" />
                Análise Concluída
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {new Date().toLocaleDateString('pt-BR', {
                  day: '2-digit',
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            
            <div className="flex gap-2">
              {onExport && (
                <Button variant="outline" size="sm" onClick={onExport}>
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              )}
              {onShare && (
                <Button variant="outline" size="sm" onClick={onShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Compartilhar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-lg">{caseTitle}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {caseDescription}
              </p>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>{successfulFiles.length} arquivos processados</span>
              </div>
              
              {failedFiles.length > 0 && (
                <div className="flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <span>{failedFiles.length} com erro</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Arquivos Processados ({result.files.length})
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <div className="space-y-3">
            {result.files.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg">{getFileTypeIcon(file.type)}</span>
                  
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatFileSize(file.size)} • {file.type}
                    </p>
                    {file.error && (
                      <p className="text-xs text-red-600 mt-1">{file.error}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {file.error ? (
                    <Badge variant="destructive">Erro</Badge>
                  ) : (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      Processado
                    </Badge>
                  )}
                  
                  {file.extractedText && !file.error && (
                    <Badge variant="outline">
                      {file.extractedText.length > 0 ? 'Texto extraído' : 'Arquivo binário'}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Resumo Executivo
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-32">
            <p className="text-sm leading-relaxed">
              {result.summary}
            </p>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            Análise Detalhada
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-64">
            <div className="prose prose-sm max-w-none">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {result.analysis}
              </p>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {result.recommendations && result.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-600" />
              Recomendações ({result.recommendations.length})
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-3">
              {result.recommendations.map((recommendation, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <p className="text-sm leading-relaxed">{recommendation}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {failedFiles.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800">
              <AlertTriangle className="h-5 w-5" />
              Avisos Importantes
            </CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-yellow-800">
                Alguns arquivos apresentaram problemas durante o processamento:
              </p>
              
              <ul className="text-sm text-yellow-700 space-y-1">
                {failedFiles.map((file, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span>•</span>
                    <span>
                      <strong>{file.name}:</strong> {file.error}
                    </span>
                  </li>
                ))}
              </ul>
              
              <p className="text-sm text-yellow-800 mt-3">
                Recomendamos verificar os arquivos com erro e tentar o upload novamente.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}; 
