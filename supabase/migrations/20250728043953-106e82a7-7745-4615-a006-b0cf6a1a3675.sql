-- Criar enum para roles de usuário
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Criar tabela de roles de usuário
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Habilitar RLS na tabela user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Criar função de segurança para verificar roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Criar função para verificar se o usuário atual é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
$$;

-- Políticas RLS para user_roles
CREATE POLICY "Admins can view all user roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert user roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update user roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete user roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Criar tabela de estatísticas de uso para dashboard admin
CREATE TABLE public.usage_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    cases_created INTEGER NOT NULL DEFAULT 0,
    cases_processed INTEGER NOT NULL DEFAULT 0,
    api_requests INTEGER NOT NULL DEFAULT 0,
    tokens_used INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, date)
);

-- Habilitar RLS na tabela usage_stats
ALTER TABLE public.usage_stats ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para usage_stats
CREATE POLICY "Admins can view all usage stats"
ON public.usage_stats
FOR SELECT
TO authenticated
USING (public.is_admin());

CREATE POLICY "System can insert usage stats"
ON public.usage_stats
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update usage stats"
ON public.usage_stats
FOR UPDATE
TO authenticated
USING (true);

-- Atualizar políticas das tabelas ai_settings e default_prompts para serem gerenciadas apenas por admins
DROP POLICY IF EXISTS "Users can create their own AI settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Users can update their own AI settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Users can delete their own AI settings" ON public.ai_settings;
DROP POLICY IF EXISTS "Users can view their own AI settings" ON public.ai_settings;

CREATE POLICY "Admins can manage all AI settings"
ON public.ai_settings
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own AI settings"
ON public.ai_settings
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their own default prompts" ON public.default_prompts;
DROP POLICY IF EXISTS "Users can update their own default prompts" ON public.default_prompts;
DROP POLICY IF EXISTS "Users can delete their own default prompts" ON public.default_prompts;
DROP POLICY IF EXISTS "Users can view their own default prompts" ON public.default_prompts;

CREATE POLICY "Admins can manage all default prompts"
ON public.default_prompts
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());

CREATE POLICY "Users can view their own default prompts"
ON public.default_prompts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Adicionar trigger para atualizar updated_at
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_usage_stats_updated_at
BEFORE UPDATE ON public.usage_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();