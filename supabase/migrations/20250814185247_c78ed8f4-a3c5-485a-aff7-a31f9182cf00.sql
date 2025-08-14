-- Criar aprovação para o usuário bruno.manhaes@sapiensia.com
INSERT INTO user_approvals (user_id, email, display_name, status, approval_date, approved_by)
SELECT 
  id,
  email,
  'Bruno Manhães',
  'approved',
  now(),
  'admin'
FROM auth.users 
WHERE email = 'bruno.manhaes@sapiensia.com'
ON CONFLICT (user_id) DO NOTHING;