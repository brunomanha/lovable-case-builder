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
    
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    const action = url.searchParams.get('action'); // 'approve' or 'reject'

    if (!userId || !action) {
      throw new Error('Parâmetros obrigatórios faltando');
    }

    // Buscar dados da aprovação
    const { data: approval, error: fetchError } = await supabase
      .from('user_approvals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !approval) {
      throw new Error('Solicitação não encontrada ou já processada');
    }

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    // Atualizar status da aprovação
    const { error: updateError } = await supabase
      .from('user_approvals')
      .update({
        status: newStatus,
        approved_by: 'admin',
        approval_date: new Date().toISOString()
      })
      .eq('user_id', userId);

    if (updateError) {
      throw new Error(`Erro ao atualizar aprovação: ${updateError.message}`);
    }

    if (action === 'approve') {
      // Ativar o usuário no auth
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { email_confirm: true }
      );

      if (authError) {
        console.error('Erro ao ativar usuário:', authError);
      }

      // Criar entrada na tabela de limitações para demos se for demo@email.com
      if (approval.email === 'demo@email.com') {
        await supabase
          .from('demo_limitations')
          .insert({
            user_id: userId,
            email: approval.email,
            cases_created: 0,
            max_cases_allowed: 1
          });
      }
    }

    // Enviar email de confirmação para o usuário
    if (resendApiKey) {
      const resend = new Resend(resendApiKey);
      
      const subject = action === 'approve' 
        ? 'Cadastro Aprovado - IARA' 
        : 'Cadastro Não Aprovado - IARA';
        
      const message = action === 'approve'
        ? `
          <h2>🎉 Seu cadastro foi aprovado!</h2>
          <p>Olá ${approval.display_name},</p>
          <p>Seu cadastro no sistema IARA foi aprovado com sucesso!</p>
          <p>Agora você pode acessar o sistema e utilizar nossa plataforma de análise jurídica inteligente.</p>
          <p><a href="${supabaseUrl.replace('/v1', '')}" style="background: #3b82f6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Acessar IARA</a></p>
        `
        : `
          <h2>Cadastro Não Aprovado</h2>
          <p>Olá ${approval.display_name},</p>
          <p>Infelizmente seu cadastro no sistema IARA não foi aprovado no momento.</p>
          <p>Entre em contato conosco se precisar de mais informações.</p>
        `;

      await resend.emails.send({
        from: 'IARA System <onboarding@resend.dev>',
        to: [approval.email],
        subject: subject,
        html: message,
      });
    }

    return new Response(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${action === 'approve' ? '✅ Usuário Aprovado' : '❌ Usuário Rejeitado'}</h2>
          <p><strong>Nome:</strong> ${approval.display_name}</p>
          <p><strong>Email:</strong> ${approval.email}</p>
          <p><strong>Ação:</strong> ${action === 'approve' ? 'Aprovado' : 'Rejeitado'} em ${new Date().toLocaleString('pt-BR')}</p>
          ${action === 'approve' ? '<p>✅ Email de confirmação enviado para o usuário.</p>' : ''}
        </body>
      </html>
    `, {
      headers: { 'Content-Type': 'text/html' },
    });

  } catch (error) {
    console.error('Erro na aprovação:', error);
    return new Response(`
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>❌ Erro</h2>
          <p>${error.message}</p>
        </body>
      </html>
    `, {
      status: 500,
      headers: { 'Content-Type': 'text/html' },
    });
  }
});