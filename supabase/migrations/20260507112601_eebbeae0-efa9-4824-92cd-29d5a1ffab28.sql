
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('email-images','email-images',true,2097152,ARRAY['image/png','image/jpeg','image/webp','image/gif'])
ON CONFLICT (id) DO UPDATE SET public=EXCLUDED.public, file_size_limit=EXCLUDED.file_size_limit, allowed_mime_types=EXCLUDED.allowed_mime_types;

CREATE POLICY "Email images public read" ON storage.objects FOR SELECT USING (bucket_id='email-images');
CREATE POLICY "Users upload email images in own folder" ON storage.objects FOR INSERT WITH CHECK (bucket_id='email-images' AND auth.uid()::text=(storage.foldername(name))[1]);
CREATE POLICY "Users update own email images" ON storage.objects FOR UPDATE USING (bucket_id='email-images' AND auth.uid()::text=(storage.foldername(name))[1]);
CREATE POLICY "Users delete own email images" ON storage.objects FOR DELETE USING (bucket_id='email-images' AND auth.uid()::text=(storage.foldername(name))[1]);
