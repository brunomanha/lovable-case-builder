import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);
    
    const { userId, email, displayName } = await req.json();

    if (!userId || !email || !displayName) {
      throw new Error('Dados obrigatórios faltando');
    }

    // Criar registro de aprovação
    const { error: approvalError } = await supabase
      .from('user_approvals')
      .insert({
        user_id: userId,
        email: email,
        display_name: displayName,
        status: 'pending'
      });

    if (approvalError) {
      throw new Error(`Erro ao criar solicitação: ${approvalError.message}`);
    }

    // Enviar email de notificação para admin
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      const approveUrl = `${supabaseUrl}/functions/v1/approve-user?userId=${userId}&action=approve`;
      const rejectUrl = `${supabaseUrl}/functions/v1/approve-user?userId=${userId}&action=reject`;

      await resend.emails.send({
        from: 'IARA System <onboarding@resend.dev>',
        to: ['admin@iara.com'], // Substitua pelo email do admin
        subject: 'Nova Solicitação de Cadastro - IARA',
        html: `
          <h2>Nova Solicitação de Cadastro</h2>
          <p><strong>Nome:</strong> ${displayName}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          
          <div style="margin: 20px 0;">
            <a href="${approveUrl}" style="background: #22c55e; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin-right: 10px;">
              ✅ Aprovar
            </a>
            <a href="${rejectUrl}" style="background: #ef4444; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
              ❌ Rejeitar
            </a>
          </div>
          
          <p>Clique em um dos botões acima para aprovar ou rejeitar este cadastro.</p>
        `,
      });
    }

    return new Response(JSON.stringify({ 
      message: 'Solicitação de aprovação enviada com sucesso' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Erro na solicitação de aprovação:', error);
    return new Response(JSON.stringify({ 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});