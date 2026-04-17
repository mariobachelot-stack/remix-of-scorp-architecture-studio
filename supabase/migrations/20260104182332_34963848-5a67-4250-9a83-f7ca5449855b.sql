-- Add public sharing fields to diagrams table
ALTER TABLE public.diagrams 
ADD COLUMN is_public boolean NOT NULL DEFAULT false,
ADD COLUMN public_token text UNIQUE;