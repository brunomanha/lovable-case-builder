-- Criar policy para permitir que usuários deletem seus próprios cases
CREATE POLICY "Usuários podem deletar seus próprios cases" 
ON public.cases 
FOR DELETE 
USING (auth.uid() = user_id);