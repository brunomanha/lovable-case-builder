-- Corrigir a função para ter search_path seguro
CREATE OR REPLACE FUNCTION public.delete_user_completely(user_id_to_delete UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Primeiro, deletar todos os dados relacionados do usuário
  DELETE FROM public.usage_stats WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_approvals WHERE user_id = user_id_to_delete;
  DELETE FROM public.default_prompts WHERE user_id = user_id_to_delete;
  DELETE FROM public.ai_settings WHERE user_id = user_id_to_delete;
  DELETE FROM public.user_roles WHERE user_id = user_id_to_delete;
  DELETE FROM public.demo_limitations WHERE user_id = user_id_to_delete;
  DELETE FROM public.ai_processing_logs WHERE user_id = user_id_to_delete;
  
  -- Deletar attachments relacionados aos cases do usuário
  DELETE FROM public.attachments WHERE case_id IN (
    SELECT id FROM public.cases WHERE user_id = user_id_to_delete
  );
  
  -- Deletar ai_responses relacionados aos cases do usuário
  DELETE FROM public.ai_responses WHERE case_id IN (
    SELECT id FROM public.cases WHERE user_id = user_id_to_delete
  );
  
  -- Deletar cases do usuário
  DELETE FROM public.cases WHERE user_id = user_id_to_delete;
  
  -- Deletar profile
  DELETE FROM public.profiles WHERE user_id = user_id_to_delete;
  
  -- Finalmente, deletar o usuário do auth.users
  -- Isso só funciona com privilégios de service_role
  DELETE FROM auth.users WHERE id = user_id_to_delete;
  
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Erro ao deletar usuário: %', SQLERRM;
    RETURN FALSE;
END;
$$;