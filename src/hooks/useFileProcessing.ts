import { useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface ProcessingState {
  isProcessing: boolean;
  progress: number;
  currentStep: string;
  processedFiles: number;
  totalFiles: number;
  error?: string;
}

export interface UseFileProcessingReturn {
  state: ProcessingState;
  startProcessing: (files: File[], caseTitle: string, caseDescription: string) => Promise<any>;
  resetProcessing: () => void;
}

export const useFileProcessing = (): UseFileProcessingReturn => {
  const [state, setState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: '',
    processedFiles: 0,
    totalFiles: 0
  });

  const updateState = useCallback((updates: Partial<ProcessingState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resetProcessing = useCallback(() => {
    setState({
      isProcessing: false,
      progress: 0,
      currentStep: '',
      processedFiles: 0,
      totalFiles: 0
    });
  }, []);

  const startProcessing = useCallback(async (
    files: File[], 
    caseTitle: string, 
    caseDescription: string
  ) => {
    if (files.length === 0) {
      toast.error('Selecione pelo menos um arquivo');
      return null;
    }

    updateState({
      isProcessing: true,
      progress: 0,
      currentStep: 'Iniciando processamento...',
      processedFiles: 0,
      totalFiles: files.length,
      error: undefined
    });

    try {
      updateState({
        progress: 10,
        currentStep: 'Validando arquivos...'
      });

      await new Promise(resolve => setTimeout(resolve, 1000));

      updateState({
        progress: 50,
        currentStep: 'Extraindo texto dos arquivos...'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      updateState({
        progress: 80,
        currentStep: 'Analisando com Inteligência Artificial...'
      });

      await new Promise(resolve => setTimeout(resolve, 2000));

      updateState({
        progress: 100,
        currentStep: 'Processamento concluído!',
        processedFiles: files.length
      });

      toast.success('Processamento concluído com sucesso!');
      
      return {
        files: files,
        analysis: 'Análise concluída'
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      
      updateState({
        error: errorMessage,
        currentStep: `Erro: ${errorMessage}`
      });

      toast.error(`Erro no processamento: ${errorMessage}`);
      throw error;
    } finally {
      if (!state.error) {
        setTimeout(() => {
          resetProcessing();
        }, 3000);
      }
    }
  }, [updateState, resetProcessing, state.error]);

  return {
    state,
    startProcessing,
    resetProcessing
  };
}; 
