-- Criar tabela para logs de erros da IA
CREATE TABLE public.ai_processing_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_id UUID NOT NULL,
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'completed', 'error')),
  error_message TEXT,
  error_code TEXT,
  ai_response TEXT,
  model_used TEXT,
  processing_time INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para aprovação de usuários
CREATE TABLE public.user_approvals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT,
  approval_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar tabela para controle de limitações de conta demo
CREATE TABLE public.demo_limitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  cases_created INTEGER NOT NULL DEFAULT 0,
  max_cases_allowed INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE public.ai_processing_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_limitations ENABLE ROW LEVEL SECURITY;

-- Policies para ai_processing_logs
CREATE POLICY "Users can view their own processing logs"
ON public.ai_processing_logs
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert processing logs"
ON public.ai_processing_logs
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update processing logs"
ON public.ai_processing_logs
FOR UPDATE
USING (true);

-- Policies para user_approvals (apenas admins podem ver/gerenciar)
CREATE POLICY "Only admins can view user approvals"
ON public.user_approvals
FOR SELECT
USING (false); -- Ninguém pode ver por RLS, será gerenciado via edge functions

CREATE POLICY "System can manage user approvals"
ON public.user_approvals
FOR ALL
USING (true);

-- Policies para demo_limitations
CREATE POLICY "Users can view their own demo limitations"
ON public.demo_limitations
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage demo limitations"
ON public.demo_limitations
FOR ALL
USING (true);

-- Triggers para updated_at
CREATE TRIGGER update_ai_processing_logs_updated_at
BEFORE UPDATE ON public.ai_processing_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_approvals_updated_at
BEFORE UPDATE ON public.user_approvals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_demo_limitations_updated_at
BEFORE UPDATE ON public.demo_limitations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();