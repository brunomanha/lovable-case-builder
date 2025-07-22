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

    const { title, description, attachments = [] } = await req.json();

    if (!title || !description) {
      throw new Error('Título e descrição são obrigatórios');
    }

    console.log(`Criando caso para usuário: ${user.id}`);

    // Criar o caso
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .insert({
        title,
        description,
        user_id: user.id,
        status: 'pending'
      })
      .select()
      .single();

    if (caseError) {
      throw new Error(`Erro ao criar caso: ${caseError.message}`);
    }

    // Criar attachments se fornecidos
    if (attachments.length > 0) {
      const attachmentData = attachments.map((attachment: any) => ({
        case_id: caseData.id,
        filename: attachment.filename,
        file_url: attachment.file_url,
        file_size: attachment.file_size,
        content_type: attachment.content_type
      }));

      const { error: attachmentError } = await supabase
        .from('attachments')
        .insert(attachmentData);

      if (attachmentError) {
        console.error('Erro ao criar attachments:', attachmentError);
        // Não falhar completamente, apenas logar o erro
      }
    }

    console.log(`Caso criado com sucesso: ${caseData.id}`);

    return new Response(JSON.stringify({ 
      success: true, 
      case: caseData,
      message: 'Caso criado com sucesso'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro ao criar caso:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Erro interno do servidor'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});