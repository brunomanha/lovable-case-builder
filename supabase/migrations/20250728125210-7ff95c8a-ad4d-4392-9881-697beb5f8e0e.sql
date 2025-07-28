-- Add is_active field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN is_active boolean NOT NULL DEFAULT true;

-- Add index for better performance
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);