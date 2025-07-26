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
    const { data: caseData, error: caseError } = await userSupabase
      .from('cases')
      .select(`
        id,
        title,
        description,
        user_id
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

    // Buscar anexos separadamente
    const { data: attachments, error: attachmentsError } = await userSupabase
      .from('attachments')
      .select('filename, file_url, content_type')
      .eq('case_id', caseId);

    if (attachmentsError) {
      console.error('Erro ao buscar anexos:', attachmentsError);
    }

    console.log(`Anexos encontrados: ${attachments?.length || 0}`, attachments);

    // Adicionar anexos ao objeto do caso
    const caseDataWithAttachments = {
      ...caseData,
      attachments: attachments || []
    };

    // Buscar configurações de IA do usuário
    const { data: aiSettings, error: aiSettingsError } = await supabase
      .from('ai_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    // Buscar prompt padrão do usuário
    const { data: defaultPrompt, error: promptError } = await supabase
      .from('default_prompts')
      .select('prompt_text')
      .eq('user_id', user.id)
      .single();

    // Atualizar status para processando
    await supabase
      .from('cases')
      .update({ status: 'processing' })
      .eq('id', caseId);

    let aiResponse = '';
    let modelUsed = 'mock';
    const startTime = Date.now();

    // Usar configurações do usuário ou padrões
    const userPrompt = defaultPrompt?.prompt_text || await getDefaultPrompt();
    const userApiKey = aiSettings?.api_key;
    const userModel = aiSettings?.model || 'deepseek/deepseek-r1-distill-qwen-32b';
    const userProvider = aiSettings?.provider || 'openrouter';
    const userTemperature = aiSettings?.temperature || 0.7;
    const userMaxTokens = aiSettings?.max_tokens || 2048;

    console.log(`Configurações do usuário: Provider: ${userProvider}, Model: ${userModel}, API Key: ${userApiKey ? 'presente' : 'ausente'}`);

    // Preparar informações dos anexos
    let attachmentInfo = '';
    let processedAttachments = 0;
    
    if (caseDataWithAttachments.attachments && caseDataWithAttachments.attachments.length > 0) {
      attachmentInfo = `\n\nANEXOS PARA ANÁLISE (${caseDataWithAttachments.attachments.length} arquivos encontrados):`;
      
      for (let i = 0; i < caseDataWithAttachments.attachments.length; i++) {
        const attachment = caseDataWithAttachments.attachments[i];
        attachmentInfo += `\n\n--- ANEXO ${i + 1}: ${attachment.filename} ---`;
        attachmentInfo += `\nTipo: ${attachment.content_type}`;
        
        // Tentar processar cada anexo
        if (attachment.file_url && attachment.content_type) {
          try {
            console.log(`Processando anexo ${i + 1}: ${attachment.filename} (${attachment.content_type})`);
            
            if (attachment.content_type.includes('text/') || 
                attachment.content_type.includes('application/json') ||
                attachment.content_type.includes('application/xml')) {
              
              console.log(`Baixando conteúdo de texto de: ${attachment.filename}`);
              const fileResponse = await fetch(attachment.file_url);
              if (fileResponse.ok) {
                const fileContent = await fileResponse.text();
                attachmentInfo += `\nStatus: ✅ PROCESSADO AUTOMATICAMENTE`;
                attachmentInfo += `\nConteúdo:\n${fileContent.substring(0, 2000)}${fileContent.length > 2000 ? '...[conteúdo truncado]' : ''}`;
                processedAttachments++;
              } else {
                console.error(`Erro HTTP ao baixar ${attachment.filename}: ${fileResponse.status}`);
                attachmentInfo += `\nStatus: ❌ Erro ao baixar (HTTP ${fileResponse.status})`;
              }
            } else if (attachment.content_type.includes('application/pdf')) {
              attachmentInfo += `\nStatus: 📄 ARQUIVO PDF IDENTIFICADO`;
              attachmentInfo += `\nDescrição: Documento PDF com informações relevantes para análise jurídica`;
              attachmentInfo += `\nObservação: Conteúdo PDF requer extração manual ou OCR para análise completa`;
              processedAttachments++;
            } else if (attachment.content_type.includes('image/')) {
              attachmentInfo += `\nStatus: 🖼️ IMAGEM IDENTIFICADA`;
              attachmentInfo += `\nDescrição: Arquivo de imagem que pode conter evidências visuais`;
              attachmentInfo += `\nObservação: Análise visual requer processamento de OCR ou descrição manual`;
              processedAttachments++;
            } else {
              attachmentInfo += `\nStatus: 📎 ARQUIVO BINÁRIO`;
              attachmentInfo += `\nObservação: Formato ${attachment.content_type} requer processamento especializado`;
              processedAttachments++;
            }
          } catch (error) {
            console.error(`Erro ao processar anexo ${attachment.filename}:`, error);
            attachmentInfo += `\nStatus: ❌ ERRO NO PROCESSAMENTO`;
            attachmentInfo += `\nErro: ${error.message}`;
          }
        } else {
          attachmentInfo += `\nStatus: ⚠️ URL OU TIPO NÃO DISPONÍVEL`;
        }
      }
      
      attachmentInfo += `\n\nINSTRUÇÕES PARA ANÁLISE DOS ANEXOS:`;
      attachmentInfo += `\n- Considere todos os anexos fornecidos em sua análise`;
      attachmentInfo += `\n- Para arquivos que não puderam ser processados automaticamente, mencione sua limitação`;
      attachmentInfo += `\n- Solicite esclarecimentos sobre conteúdos específicos quando necessário`;
      attachmentInfo += `\n- Forneça recomendações baseadas nos tipos de arquivo disponíveis`;
    }

    // Preparar prompt completo
    const fullPrompt = `${userPrompt}

CASO PARA ANÁLISE:

TÍTULO: ${caseData.title}
DESCRIÇÃO: ${caseData.description}${attachmentInfo}

Por favor, analise este caso seguindo as diretrizes estabelecidas e considerando todos os anexos disponíveis.`;

    // Usar o provider configurado pelo usuário
    if (userApiKey && userProvider) {
      console.log(`Enviando para ${userProvider} com modelo: ${userModel}`);
      
      let apiUrl = '';
      let headers: any = {
        'Authorization': `Bearer ${userApiKey}`,
        'Content-Type': 'application/json',
      };
      
      // Configurar URL e headers específicos por provider
      switch (userProvider) {
        case 'openrouter':
          apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
          headers['HTTP-Referer'] = 'https://hvcfntuwyhgfbbdruihq.supabase.co';
          headers['X-Title'] = 'Sistema de Análise IA';
          break;
        case 'openai':
          apiUrl = 'https://api.openai.com/v1/chat/completions';
          break;
        case 'anthropic':
          apiUrl = 'https://api.anthropic.com/v1/messages';
          headers['anthropic-version'] = '2023-06-01';
          break;
        case 'deepseek':
          apiUrl = 'https://api.deepseek.com/v1/chat/completions';
          break;
        case 'groq':
          apiUrl = 'https://api.groq.com/openai/v1/chat/completions';
          break;
        default:
          throw new Error(`Provider não suportado: ${userProvider}`);
      }
      
      try {
        let requestBody: any;
        
        // Anthropic usa formato diferente
        if (userProvider === 'anthropic') {
          requestBody = {
            model: userModel,
            max_tokens: userMaxTokens,
            messages: [
              { role: 'user', content: `${userPrompt}\n\n${fullPrompt}` }
            ],
            temperature: userTemperature,
          };
        } else {
          // OpenAI, OpenRouter, DeepSeek, Groq usam formato OpenAI
          requestBody = {
            model: userModel,
            messages: [
              { 
                role: 'system', 
                content: userPrompt
              },
              { role: 'user', content: fullPrompt }
            ],
            max_tokens: userMaxTokens,
            temperature: userTemperature,
          };
        }

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${userProvider} API error: ${response.statusText} - ${errorText}`);
        }

        const responseData = await response.json();
        
        // Extrair resposta baseado no provider
        if (userProvider === 'anthropic') {
          aiResponse = responseData.content[0].text;
        } else {
          aiResponse = responseData.choices[0].message.content;
        }
        
        modelUsed = userModel;
        
      } catch (error) {
        console.error(`Erro ao chamar ${userProvider}:`, error);
        throw new Error(`Erro na API do ${userProvider}: ${error.message}`);
      }
      
    } else {
      // Fallback para APIs de sistema
      const openrouterApiKey = Deno.env.get('OPENROUTER_API_KEY');
      const deepseekApiKey = Deno.env.get('DEEPSEEK_API_KEY');
      
      if (openrouterApiKey) {
        console.log('Usando OpenRouter como fallback...');
        
        try {
          const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openrouterApiKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://hvcfntuwyhgfbbdruihq.supabase.co',
              'X-Title': 'Sistema de Análise IA'
            },
            body: JSON.stringify({
              model: userModel,
              messages: [
                { 
                  role: 'system', 
                  content: userPrompt
                },
                { role: 'user', content: fullPrompt }
              ],
              max_tokens: userMaxTokens,
              temperature: userTemperature,
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`OpenRouter API error: ${response.statusText} - ${errorText}`);
          }

          const responseData = await response.json();
          aiResponse = responseData.choices[0].message.content;
          modelUsed = userModel;
          
        } catch (error) {
          console.error('Erro ao chamar OpenRouter:', error);
          throw new Error(`Erro na API do OpenRouter: ${error.message}`);
        }
        
      } else if (deepseekApiKey) {
        // Fallback para DeepSeek se configurado
        console.log('Usando DeepSeek como fallback...');
        
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
                content: userPrompt
              },
              { role: 'user', content: fullPrompt }
            ],
            max_tokens: userMaxTokens,
            temperature: userTemperature,
          }),
        });

        if (!deepseekResponse.ok) {
          throw new Error(`DeepSeek API error: ${deepseekResponse.statusText}`);
        }

        const deepseekData = await deepseekResponse.json();
        aiResponse = deepseekData.choices[0].message.content;
        modelUsed = 'deepseek-chat';
        
      } else {
      // Usar resposta mock se não houver configuração
      aiResponse = `${userPrompt}

## Análise do Caso: ${caseData.title}

### Resumo
Este caso foi recebido e está sendo processado pelo sistema de análise de IA.

### Análise Técnica
**Título:** ${caseDataWithAttachments.title}
**Descrição:** ${caseDataWithAttachments.description}
**Anexos:** ${caseDataWithAttachments.attachments?.length || 0} arquivo(s)

### Recomendações
1. Revisar a documentação relacionada
2. Verificar os anexos fornecidos
3. Considerar consulta com especialistas se necessário

### Próximos Passos
- Análise detalhada dos documentos anexos
- Validação das informações fornecidas
- Elaboração de plano de ação específico

*Nota: Configure sua chave de API e modelo nas configurações para obter análises completas com IA.*
        `;
        modelUsed = 'mock-ai';
      }
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

    console.log(`Caso ${caseId} processado com sucesso em ${processingTime}ms. Anexos processados: ${processedAttachments}/${caseDataWithAttachments.attachments?.length || 0}`);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Caso processado com sucesso',
      response: aiResponse,
      processing_time: processingTime,
      model_used: modelUsed,
      attachments_processed: processedAttachments,
      total_attachments: caseDataWithAttachments.attachments?.length || 0
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