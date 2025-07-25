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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização não encontrado');
    }

    // Create user-scoped client with the user's token
    const token = authHeader.replace('Bearer ', '');
    const userSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from the token
    const { data: { user }, error: authError } = await userSupabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Usuário não autenticado');
    }

    // Create service role client for admin operations
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { caseId } = await req.json();

    if (!caseId) {
      throw new Error('caseId é obrigatório');
    }

    // Validate caseId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(caseId)) {
      throw new Error('Formato de caseId inválido');
    }

    console.log(`Processando caso: ${caseId} para usuário: ${user.id}`);

    // Buscar o caso no banco de dados e verificar propriedade
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

    // Critical: Verify case ownership
    if (caseData.user_id !== user.id) {
      throw new Error('Acesso negado: você não tem permissão para processar este caso');
    }


    // Atualizar status para processando
    await supabase
      .from('cases')
      .update({ status: 'processing' })
      .eq('id', caseId);

    let aiResponse = '';
    let modelUsed = 'mock';
    const startTime = Date.now();

    // Carregar prompt padrão personalizado
    const defaultPrompt = await getDefaultPrompt();

    if (deepseekApiKey) {
      // Usar DeepSeek se a chave estiver disponível
      const prompt = `${defaultPrompt}

CASO PARA ANÁLISE:

TÍTULO: ${caseData.title}
DESCRIÇÃO: ${caseData.description}

Anexos: ${caseData.attachments?.length || 0} arquivo(s) anexado(s).

Por favor, analise este caso seguindo as diretrizes estabelecidas.
      `;

      console.log('Enviando para DeepSeek...');
      
      const deepseekResponse = await fetch('https://api.deepseek.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${deepseekApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { 
              role: 'system', 
              content: defaultPrompt
            },
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      });

      if (!deepseekResponse.ok) {
        throw new Error(`DeepSeek API error: ${deepseekResponse.statusText}`);
      }

      const deepseekData = await deepseekResponse.json();
      aiResponse = deepseekData.choices[0].message.content;
      modelUsed = 'deepseek-chat';
      
    } else {
      // Usar resposta mock se não houver chave da API
      aiResponse = `${defaultPrompt}

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

*Nota: Esta é uma resposta de demonstração. Configure sua chave de API do DeepSeek para obter análises completas com IA.*
      `;
      modelUsed = 'mock-ai';
    }

// Função para obter prompt padrão
async function getDefaultPrompt() {
  return `Você é um assistente especializado em análise de documentos e casos técnicos.

Por favor, analise cuidadosamente o caso apresentado e forneça:

1. **Resumo Executivo**: Síntese clara dos pontos principais
2. **Análise Detalhada**: Exame técnico aprofundado dos documentos
3. **Principais Achados**: Pontos críticos identificados
4. **Recomendações**: Próximos passos sugeridos
5. **Considerações Importantes**: Alertas e observações relevantes

Seja objetivo, profissional e forneça insights valiosos baseados nas informações apresentadas.`;
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
        confidence_score: deepseekApiKey ? 0.85 : 0.60
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