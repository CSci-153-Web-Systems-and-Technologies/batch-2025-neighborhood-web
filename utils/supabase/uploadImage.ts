// utils/supabase/uploadImage.ts
import { createClient } from "@/utils/supabase/client";

/**
 * Uploads a file to Supabase storage and returns its public URL.
 * * @param file - The browser File object to upload
 * @param bucket - The name of the bucket (e.g., 'neighborhood-images')
 * @param folder - (Optional) A folder name to organize files (e.g., 'avatars' or 'reviews')
 * @returns The public URL string of the uploaded file, or null if upload failed.
 */
export async function uploadImage(file: File, bucket: string, folder?: string): Promise<string | null> {
  const supabase = createClient();

  // 1. Validate that the user is logged in before trying to upload
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("Upload failed: User must be logged in to upload files.");
    alert("You must be logged in to upload images.");
    return null;
  }

  // 2. Create a unique file path
  // We get the file extension (e.g., 'jpg' or 'png')
  const fileExt = file.name.split('.').pop();
  // We create a unique name using a timestamp and random numbers
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
  // If a folder was provided, prepend it (e.g., "avatars/123456.jpg")
  const filePath = folder ? `${folder}/${fileName}` : fileName;

  try {
    // 3. Perform the upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600', // Tell browsers to cache the image for 1 hour
        upsert: false // Don't overwrite if a file with the exact same name exists (unlikely due to our naming)
      });

    if (uploadError) {
      throw uploadError;
    }

    // 4. Get the Public URL for the uploaded file
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    // Return the full public URL (e.g. https://xyz.supabase.co/storage/v1/object/public/...)
    console.log("Image uploaded successfully:", urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error: any) {
    console.error("Error uploading image:", error.message);
    alert("Failed to upload image. Please try again.");
    return null;
  }
}