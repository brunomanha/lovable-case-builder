-- Remover função has_role duplicada que não tem search_path
DROP FUNCTION IF EXISTS public.has_role(UUID, app_role);