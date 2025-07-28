import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateAdminRequest {
  userId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false }
    });

    const { userId } = await req.json() as CreateAdminRequest;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID é obrigatório' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Verificar se já existe um admin
    const { data: existingAdmin } = await supabase
      .from('user_roles')
      .select('id')
      .eq('role', 'admin')
      .single();

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ error: 'Já existe um usuário administrador no sistema' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Criar role de admin para o usuário
    const { data, error } = await supabase
      .from('user_roles')
      .insert({
        user_id: userId,
        role: 'admin'
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar admin:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Usuário ${userId} criado como administrador`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Usuário administrador criado com sucesso',
        adminUser: data
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na função create-admin-user:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});