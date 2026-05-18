
-- Public CDN fetches go via the storage object endpoint (works for any public bucket
-- regardless of RLS). The RLS SELECT policy controls who can LIST or query objects.
-- Restrict listing to the file owner.
DROP POLICY IF EXISTS "Email images public read" ON storage.objects;

CREATE POLICY "Users list own email images"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'email-images'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
