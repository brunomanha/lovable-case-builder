-- Strengthen RLS policies to prevent privilege escalation and improve security

-- 1. Add audit logging table for security monitoring
CREATE TABLE public.security_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view audit logs" 
ON public.security_audit_log 
FOR SELECT 
USING (is_admin());

-- System can insert audit logs
CREATE POLICY "System can insert audit logs" 
ON public.security_audit_log 
FOR INSERT 
WITH CHECK (true);

-- 2. Strengthen user_roles table to prevent self-modification
-- Drop existing policies and recreate with stricter controls
DROP POLICY IF EXISTS "Admins can insert user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user roles" ON public.user_roles;

-- Recreate with additional safety checks
CREATE POLICY "Admins can insert user roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  has_role(auth.uid(), 'admin'::text) 
  AND auth.uid() != user_id  -- Prevent admins from modifying their own roles
);

CREATE POLICY "Admins can update user roles" 
ON public.user_roles 
FOR UPDATE 
USING (
  has_role(auth.uid(), 'admin'::text)
  AND auth.uid() != user_id  -- Prevent admins from modifying their own roles
);

CREATE POLICY "Admins can delete user roles" 
ON public.user_roles 
FOR DELETE 
USING (
  has_role(auth.uid(), 'admin'::text)
  AND auth.uid() != user_id  -- Prevent admins from modifying their own roles
);

-- 3. Add more restrictive policies for sensitive profile data
-- Create separate policy for viewing vs updating sensitive data
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

CREATE POLICY "Users can view basic profile data" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() = user_id
);

-- Create function to log profile updates
CREATE OR REPLACE FUNCTION public.log_profile_update()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.security_audit_log (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    auth.uid(),
    'profile_update',
    'profiles',
    NEW.id::text,
    jsonb_build_object(
      'changed_fields', (
        SELECT jsonb_object_agg(key, value)
        FROM (
          SELECT key, value
          FROM jsonb_each(to_jsonb(NEW))
          WHERE value IS DISTINCT FROM (to_jsonb(OLD) -> key)
        ) t
      )
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for profile updates
CREATE TRIGGER log_profile_updates
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.log_profile_update();

-- 4. Add function to log admin actions
CREATE OR REPLACE FUNCTION public.log_admin_action(
  action_type TEXT,
  resource_type TEXT,
  resource_id TEXT DEFAULT NULL,
  details JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  IF is_admin() THEN
    INSERT INTO public.security_audit_log (
      user_id, action, resource_type, resource_id, details
    ) VALUES (
      auth.uid(), action_type, resource_type, resource_id, details
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create function to check for suspicious activity
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  user_id UUID,
  action_type TEXT,
  time_window INTERVAL DEFAULT '1 hour',
  max_attempts INTEGER DEFAULT 10
)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COUNT(*) 
    FROM public.security_audit_log 
    WHERE security_audit_log.user_id = check_rate_limit.user_id 
      AND action = action_type 
      AND created_at > now() - time_window
  ) < max_attempts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;