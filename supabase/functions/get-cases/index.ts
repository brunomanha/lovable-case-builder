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
    // Get the authorization header
    const authorization = req.headers.get('Authorization');
    if (!authorization) {
      throw new Error('Token de autorização obrigatório');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Create Supabase client with user's token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authorization } }
    });

    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Usuário não autenticado');
    }

    const url = new URL(req.url);
    const caseId = url.searchParams.get('caseId');

    if (caseId) {
      // Buscar caso específico com resposta da IA
      console.log(`Buscando caso: ${caseId}`);
      
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          updated_at,
          attachments (
            id,
            filename,
            file_url,
            file_size,
            content_type,
            created_at
          ),
          ai_responses (
            id,
            response_text,
            model_used,
            processing_time,
            confidence_score,
            created_at
          )
        `)
        .eq('id', caseId)
        .eq('user_id', user.id)
        .single();

      if (caseError) {
        throw new Error(`Erro ao buscar caso: ${caseError.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        case: caseData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });

    } else {
      // Buscar todos os casos do usuário
      console.log(`Buscando casos do usuário: ${user.id}`);
      
      const { data: casesData, error: casesError } = await supabase
        .from('cases')
        .select(`
          id,
          title,
          description,
          status,
          created_at,
          updated_at,
          attachments (count),
          ai_responses (count)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (casesError) {
        throw new Error(`Erro ao buscar casos: ${casesError.message}`);
      }

      return new Response(JSON.stringify({ 
        success: true, 
        cases: casesData
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

  } catch (error) {
    console.error('Erro ao buscar casos:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});