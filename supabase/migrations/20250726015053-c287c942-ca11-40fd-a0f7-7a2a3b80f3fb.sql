-- Criar bucket para armazenar os anexos dos casos
INSERT INTO storage.buckets (id, name, public) VALUES ('case-attachments', 'case-attachments', true);

-- Criar políticas para o bucket case-attachments
CREATE POLICY "Usuários podem visualizar anexos de seus casos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'case-attachments' AND 
  EXISTS (
    SELECT 1 FROM cases c 
    JOIN attachments a ON c.id = a.case_id 
    WHERE a.file_url = storage.objects.name AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem fazer upload de anexos em seus casos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'case-attachments' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Usuários podem atualizar anexos de seus casos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'case-attachments' AND 
  EXISTS (
    SELECT 1 FROM cases c 
    JOIN attachments a ON c.id = a.case_id 
    WHERE a.file_url = storage.objects.name AND c.user_id = auth.uid()
  )
);

CREATE POLICY "Usuários podem deletar anexos de seus casos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'case-attachments' AND 
  EXISTS (
    SELECT 1 FROM cases c 
    JOIN attachments a ON c.id = a.case_id 
    WHERE a.file_url = storage.objects.name AND c.user_id = auth.uid()
  )
);