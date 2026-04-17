-- Add new role value to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'library_admin';