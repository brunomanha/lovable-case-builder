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

    // Create Supabase client - JWT verification is handled by the runtime
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get the Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Token de autorização não encontrado');
    }

    // Create Supabase client with the user's token
    const token = authHeader.replace('Bearer ', '');
    const supabaseWithAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get user from the token
    const { data: { user }, error: authError } = await supabaseWithAuth.auth.getUser(token);
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Usuário não autenticado');
    }

    const { title, description, attachments = [] } = await req.json();

    // Enhanced input validation
    if (!title || !description) {
      throw new Error('Título e descrição são obrigatórios');
    }

    // Security validation
    if (typeof title !== 'string' || typeof description !== 'string') {
      throw new Error('Dados inválidos fornecidos');
    }

    if (title.length > 200) {
      throw new Error('Título não pode exceder 200 caracteres');
    }

    if (description.length > 5000) {
      throw new Error('Descrição não pode exceder 5000 caracteres');
    }

    // Validate attachments if provided
    if (attachments && Array.isArray(attachments)) {
      const allowedTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'text/plain', 
        'text/csv',
        'application/json',
        'image/jpeg', 
        'image/jpg',
        'image/png', 
        'image/gif'
      ];
      const maxFileSize = 50 * 1024 * 1024; // 50MB

      for (const attachment of attachments) {
        if (!attachment.filename || !attachment.content_type) {
          throw new Error('Dados de anexo inválidos');
        }

        if (!allowedTypes.includes(attachment.content_type)) {
          throw new Error(`Tipo de arquivo não permitido: ${attachment.content_type}`);
        }

        if (attachment.file_size && attachment.file_size > maxFileSize) {
          throw new Error('Arquivo muito grande. Máximo: 50MB');
        }
      }
    }

    console.log(`Criando caso para usuário: ${user.id}`);

    // Criar o caso
    const { data: caseData, error: caseError } = await supabaseWithAuth
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
    console.log(`Attachments recebidos: ${attachments.length}`, attachments);
    if (attachments.length > 0) {
      const attachmentData = attachments.map((attachment: any) => ({
        case_id: caseData.id,
        filename: attachment.filename,
        file_url: attachment.file_url,
        file_size: attachment.file_size,
        content_type: attachment.content_type
      }));

      console.log('Dados dos anexos a serem inseridos:', attachmentData);

      const { data: insertedAttachments, error: attachmentError } = await supabaseWithAuth
        .from('attachments')
        .insert(attachmentData)
        .select();

      if (attachmentError) {
        console.error('Erro ao criar attachments:', attachmentError);
        // Não falhar completamente, apenas logar o erro
      } else {
        console.log('Anexos criados com sucesso:', insertedAttachments);
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