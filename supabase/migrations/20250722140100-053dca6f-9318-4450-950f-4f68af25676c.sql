-- Criar tabela de usuários/profiles
CREATE TABLE public.profiles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE,
    display_name TEXT,
    email TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para profiles
CREATE POLICY "Profiles são visíveis por todos"
ON public.profiles
FOR SELECT
USING (true);

CREATE POLICY "Usuários podem inserir seu próprio profile"
ON public.profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seu próprio profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- Criar tabela de casos
CREATE TABLE public.cases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

-- Políticas para cases
CREATE POLICY "Usuários podem ver seus próprios cases"
ON public.cases
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem criar seus próprios cases"
ON public.cases
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar seus próprios cases"
ON public.cases
FOR UPDATE
USING (auth.uid() = user_id);

-- Criar tabela de anexos
CREATE TABLE public.attachments (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    content_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Políticas para attachments
CREATE POLICY "Usuários podem ver anexos de seus próprios cases"
ON public.attachments
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = attachments.case_id 
    AND cases.user_id = auth.uid()
));

CREATE POLICY "Usuários podem inserir anexos em seus próprios cases"
ON public.attachments
FOR INSERT
WITH CHECK (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = attachments.case_id 
    AND cases.user_id = auth.uid()
));

-- Criar tabela de respostas da IA
CREATE TABLE public.ai_responses (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
    response_text TEXT NOT NULL,
    model_used TEXT,
    processing_time INTEGER, -- tempo em milissegundos
    confidence_score DECIMAL(3,2), -- 0.00 a 1.00
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.ai_responses ENABLE ROW LEVEL SECURITY;

-- Políticas para ai_responses
CREATE POLICY "Usuários podem ver respostas de seus próprios cases"
ON public.ai_responses
FOR SELECT
USING (EXISTS (
    SELECT 1 FROM public.cases 
    WHERE cases.id = ai_responses.case_id 
    AND cases.user_id = auth.uid()
));

-- Funções para timestamps automáticos
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualizar timestamps
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cases_updated_at
    BEFORE UPDATE ON public.cases
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_cases_user_id ON public.cases(user_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_attachments_case_id ON public.attachments(case_id);
CREATE INDEX idx_ai_responses_case_id ON public.ai_responses(case_id);