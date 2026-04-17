-- Add created_by column to diagrams table
ALTER TABLE public.diagrams 
ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX idx_diagrams_created_by ON public.diagrams(created_by);