-- Ajustar as políticas RLS para a tabela attachments
DROP POLICY IF EXISTS "Usuários podem ver anexos de seus próprios cases" ON attachments;
DROP POLICY IF EXISTS "Usuários podem inserir anexos em seus próprios cases" ON attachments;

-- Criar políticas RLS mais simples e diretas
CREATE POLICY "Users can view attachments from their own cases" 
ON attachments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = attachments.case_id 
    AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert attachments in their own cases" 
ON attachments 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = attachments.case_id 
    AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update attachments in their own cases" 
ON attachments 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = attachments.case_id 
    AND cases.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete attachments from their own cases" 
ON attachments 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM cases 
    WHERE cases.id = attachments.case_id 
    AND cases.user_id = auth.uid()
  )
);