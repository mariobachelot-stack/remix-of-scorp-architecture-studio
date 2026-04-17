-- Add settings column to diagrams table for storing global diagram settings like connection stroke width
ALTER TABLE public.diagrams ADD COLUMN IF NOT EXISTS settings JSONB DEFAULT NULL;