-- Corrigir políticas RLS para permitir que admins vejam TODOS os logs de processamento
-- Remover políticas existentes e criar novas que permitam acesso total aos admins

DROP POLICY IF EXISTS "Users can view their own processing logs" ON ai_processing_logs;
DROP POLICY IF EXISTS "System can insert processing logs" ON ai_processing_logs;
DROP POLICY IF EXISTS "System can update processing logs" ON ai_processing_logs;

-- Políticas para ai_processing_logs
CREATE POLICY "Admins can view all processing logs" ON ai_processing_logs
FOR SELECT USING (is_admin());

CREATE POLICY "Users can view their own processing logs" ON ai_processing_logs
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert processing logs" ON ai_processing_logs
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update processing logs" ON ai_processing_logs
FOR UPDATE USING (true);

-- Corrigir políticas para ai_responses também
DROP POLICY IF EXISTS "Usuários podem ver respostas de seus próprios cases" ON ai_responses;

CREATE POLICY "Admins can view all AI responses" ON ai_responses
FOR SELECT USING (is_admin());

CREATE POLICY "Users can view AI responses from their own cases" ON ai_responses
FOR SELECT USING (EXISTS (
  SELECT 1 FROM cases 
  WHERE cases.id = ai_responses.case_id 
  AND cases.user_id = auth.uid()
));

-- Corrigir políticas para cases também
DROP POLICY IF EXISTS "Usuários podem ver seus próprios cases" ON cases;

CREATE POLICY "Admins can view all cases" ON cases
FOR SELECT USING (is_admin());

CREATE POLICY "Users can view their own cases" ON cases
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own cases" ON cases
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cases" ON cases
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cases" ON cases
FOR DELETE USING (auth.uid() = user_id);