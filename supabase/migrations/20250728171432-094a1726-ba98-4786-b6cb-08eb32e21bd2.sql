-- Adicionar política para admins poderem gerenciar todos os profiles
CREATE POLICY "Admins can manage all profiles" 
ON public.profiles 
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());