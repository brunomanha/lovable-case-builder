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

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização não encontrado');
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get user from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Usuário não autenticado');
    }

    const { provider, apiKey, model } = await req.json();

    if (!provider || !apiKey || !model) {
      throw new Error('Parâmetros obrigatórios não fornecidos: provider, apiKey, model');
    }

    console.log(`Testando conexão com ${provider} usando modelo ${model}`);

    let testResult = {
      success: false,
      message: '',
      details: {},
      responseTime: 0
    };

    const startTime = Date.now();

    // Testar conexão baseado no provedor
    switch (provider) {
      case 'openrouter':
        testResult = await testOpenRouter(apiKey, model);
        break;
      case 'openai':
        testResult = await testOpenAI(apiKey, model);
        break;
      case 'anthropic':
        testResult = await testAnthropic(apiKey, model);
        break;
      case 'deepseek':
        testResult = await testDeepSeek(apiKey, model);
        break;
      case 'groq':
        testResult = await testGroq(apiKey, model);
        break;
      default:
        throw new Error(`Provedor não suportado: ${provider}`);
    }

    testResult.responseTime = Date.now() - startTime;

    return new Response(JSON.stringify(testResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro no teste de conexão:', error);
    return new Response(JSON.stringify({ 
      success: false,
      message: `Erro no teste: ${error.message}`,
      details: { error: error.message },
      responseTime: 0
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function testOpenRouter(apiKey: string, model: string) {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'IARA - Teste de Conexão'
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Teste de conexão. Responda apenas "OK".' }
        ],
        max_tokens: 10,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso!',
      details: {
        model: data.model || model,
        response: data.choices?.[0]?.message?.content || 'Resposta recebida'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Falha na conexão com OpenRouter: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testOpenAI(apiKey: string, model: string) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Teste de conexão. Responda apenas "OK".' }
        ],
        max_tokens: 10,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso!',
      details: {
        model: data.model || model,
        response: data.choices?.[0]?.message?.content || 'Resposta recebida'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Falha na conexão com OpenAI: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testAnthropic(apiKey: string, model: string) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 10,
        messages: [
          { role: 'user', content: 'Teste de conexão. Responda apenas "OK".' }
        ]
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso!',
      details: {
        model: data.model || model,
        response: data.content?.[0]?.text || 'Resposta recebida'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Falha na conexão com Anthropic: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testDeepSeek(apiKey: string, model: string) {
  try {
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Teste de conexão. Responda apenas "OK".' }
        ],
        max_tokens: 10,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso!',
      details: {
        model: data.model || model,
        response: data.choices?.[0]?.message?.content || 'Resposta recebida'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Falha na conexão com DeepSeek: ${error.message}`,
      details: { error: error.message }
    };
  }
}

async function testGroq(apiKey: string, model: string) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'user', content: 'Teste de conexão. Responda apenas "OK".' }
        ],
        max_tokens: 10,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorData}`);
    }

    const data = await response.json();
    
    return {
      success: true,
      message: 'Conexão estabelecida com sucesso!',
      details: {
        model: data.model || model,
        response: data.choices?.[0]?.message?.content || 'Resposta recebida'
      }
    };
  } catch (error) {
    return {
      success: false,
      message: `Falha na conexão com Groq: ${error.message}`,
      details: { error: error.message }
    };
  }
}