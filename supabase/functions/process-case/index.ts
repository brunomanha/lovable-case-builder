import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { caseId } = await req.json();

    if (!caseId) {
      throw new Error('caseId é obrigatório');
    }

    console.log(`Processando caso: ${caseId}`);

    // Buscar o caso no banco de dados
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select(`
        id,
        title,
        description,
        user_id,
        attachments (
          filename,
          file_url,
          content_type
        )
      `)
      .eq('id', caseId)
      .single();

    if (caseError) {
      throw new Error(`Erro ao buscar caso: ${caseError.message}`);
    }

    // Atualizar status para processando
    await supabase
      .from('cases')
      .update({ status: 'processing' })
      .eq('id', caseId);

    let aiResponse = '';
    let modelUsed = 'mock';
    const startTime = Date.now();

    if (openaiApiKey) {
      // Usar OpenAI se a chave estiver disponível
      const prompt = `
Analise o seguinte caso e forneça uma resposta detalhada:

TÍTULO: ${caseData.title}
DESCRIÇÃO: ${caseData.description}

Anexos: ${caseData.attachments?.length || 0} arquivo(s) anexado(s).

Por favor, forneça:
1. Resumo do caso
2. Análise técnica detalhada
3. Recomendações ou próximos passos
4. Considerações importantes

Seja detalhado e profissional na sua análise.
      `;

      console.log('Enviando para OpenAI...');
      
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { 
              role: 'system', 
              content: 'Você é um assistente especializado em análise de casos técnicos. Forneça análises detalhadas e profissionais.' 
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
      }

      const openaiData = await openaiResponse.json();
      aiResponse = openaiData.choices[0].message.content;
      modelUsed = 'gpt-4o-mini';
      
    } else {
      // Usar resposta mock se não houver chave da API
      aiResponse = `
## Análise do Caso: ${caseData.title}

### Resumo
Este caso foi recebido e está sendo processado pelo sistema de análise de IA.

### Análise Técnica
**Título:** ${caseData.title}
**Descrição:** ${caseData.description}
**Anexos:** ${caseData.attachments?.length || 0} arquivo(s)

### Recomendações
1. Revisar a documentação relacionada
2. Verificar os anexos fornecidos
3. Considerar consulta com especialistas se necessário

### Próximos Passos
- Análise detalhada dos documentos anexos
- Validação das informações fornecidas
- Elaboração de plano de ação específico

*Nota: Esta é uma resposta de demonstração. Configure sua chave de API da OpenAI para obter análises completas com IA.*
      `;
      modelUsed = 'mock-ai';
    }

    const processingTime = Date.now() - startTime;

    // Salvar a resposta da IA no banco de dados
    const { error: responseError } = await supabase
      .from('ai_responses')
      .insert({
        case_id: caseId,
        response_text: aiResponse,
        model_used: modelUsed,
        processing_time: processingTime,
        confidence_score: openaiApiKey ? 0.85 : 0.60
      });

    if (responseError) {
      throw new Error(`Erro ao salvar resposta: ${responseError.message}`);
    }

    // Atualizar status do caso para concluído
    await supabase
      .from('cases')
      .update({ status: 'completed' })
      .eq('id', caseId);

    console.log(`Caso ${caseId} processado com sucesso em ${processingTime}ms`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Caso processado com sucesso',
      response: aiResponse,
      processing_time: processingTime,
      model_used: modelUsed
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao processar caso:', error);

    // Tentar atualizar o status para falha se possível
    if (req.url.includes('caseId')) {
      try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
        
        const { caseId } = await req.json().catch(() => ({}));
        if (caseId) {
          await supabase
            .from('cases')
            .update({ status: 'failed' })
            .eq('id', caseId);
        }
      } catch (updateError) {
        console.error('Erro ao atualizar status de falha:', updateError);
      }
    }

    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});