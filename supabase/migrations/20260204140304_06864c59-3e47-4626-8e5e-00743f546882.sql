-- Create storage bucket for diagram images
INSERT INTO storage.buckets (id, name, public)
VALUES ('diagram-images', 'diagram-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'diagram-images');

-- Allow anyone to view images (public bucket)
CREATE POLICY "Anyone can view diagram images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'diagram-images');

-- Allow users to delete their own images
CREATE POLICY "Users can delete own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'diagram-images' AND auth.uid()::text = (storage.foldername(name))[1]);