import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file, filename } = await req.json();
    
    if (!file || !Array.isArray(file)) {
      throw new Error('Arquivo inválido fornecido');
    }
    
    // Converter array de números para Uint8Array
    const buffer = new Uint8Array(file);
    
    // Tentar extração de texto do PDF
    const extractedText = await extractTextFromPDF(buffer, filename);
    
    return new Response(JSON.stringify({
      success: true,
      text: extractedText,
      filename: filename
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Erro na extração de PDF:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      text: `Erro ao extrair texto do PDF: ${error.message}`
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function extractTextFromPDF(buffer: Uint8Array, filename: string): Promise<string> {
  try {
    // Importar pdf-parse dinamicamente
    const pdfParse = await import('https://esm.sh/pdf-parse@1.1.1');
    
    // Extrair texto do PDF
    const pdfData = await pdfParse.default(buffer);
    
    if (pdfData.text && pdfData.text.trim().length > 0) {
      return `DOCUMENTO PDF: ${filename}
Páginas: ${pdfData.numpages}
Tamanho: ${Math.round(buffer.length / 1024)}KB

TEXTO EXTRAÍDO:
${pdfData.text.trim()}

Metadados:
- Título: ${pdfData.info?.Title || 'Não informado'}
- Autor: ${pdfData.info?.Author || 'Não informado'}
- Criação: ${pdfData.info?.CreationDate || 'Não informado'}`;
    } else {
      return `DOCUMENTO PDF: ${filename}
Páginas: ${pdfData.numpages || 0}
Tamanho: ${Math.round(buffer.length / 1024)}KB

ATENÇÃO: Nenhum texto extraído do PDF.
Este arquivo pode ser:
- Documento escaneado (apenas imagens)
- PDF protegido contra extração
- Arquivo corrompido
- Formato PDF não padrão

Para análise completa, reenvie em formato editável (DOCX, TXT) ou PDF com texto selecionável.`;
    }
    
  } catch (error) {
    console.error('Erro ao processar PDF:', error);
    
    return `ERRO NA EXTRAÇÃO DO PDF: ${filename}
Tamanho: ${Math.round(buffer.length / 1024)}KB

Detalhes do erro: ${error.message}

Possíveis causas:
- PDF corrompido ou formato inválido
- Arquivo protegido por senha
- Limitações de processamento
- Formato PDF não suportado

Recomendação: Converta o PDF para formato editável (DOCX/TXT) ou reenvie uma versão não protegida.`;
  }
}