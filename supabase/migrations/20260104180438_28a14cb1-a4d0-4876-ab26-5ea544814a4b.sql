-- Ajouter le champ zones au schéma des diagrammes
ALTER TABLE public.diagrams ADD COLUMN zones JSONB NOT NULL DEFAULT '[]'::jsonb;