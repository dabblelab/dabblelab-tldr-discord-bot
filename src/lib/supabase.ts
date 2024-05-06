import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_KEY,
);

export async function uploadImage(
  imageUrl: string,
  imagePath: string,
  imageName: string,
  storageBucket: string,
) {
  const response = await fetch(imageUrl);
  const buffer = await response.arrayBuffer();

  const fileExt = imageUrl.split(".").pop(); // Simple file extension extraction
  const filePath = `${imagePath}/${imageName}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from(storageBucket)
    .upload(filePath, buffer, {
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const uploadedPath = `${process.env.SUPABASE_BUCKET_FOLDER_LOCATION}/${data.path}`;

  return uploadedPath;
}

export async function uploadXmlFile(
  xml: string,
  xmlPath: string,
  xmlName: string,
  storageBucket: string,
) {
  const { data, error } = await supabase.storage
    .from(storageBucket)
    .upload(`${xmlPath}/${xmlName}.xml`, xml, {
      cacheControl: "3600",
      upsert: true,
      contentType: "application/rss+xml",
    });

  if (error) {
    throw error;
  }
  return data;
}

export async function uploadAudio({
  bucketName,
  filePath,
  fileName,
  fileBuffer,
}: {
  bucketName: string;
  filePath: string;
  fileName: string;
  fileBuffer: Buffer;
}): Promise<{ path: string } | null> {
  const { data, error } = await supabase.storage
    .from(bucketName)
    .upload(`${filePath}/${fileName}.mp3`, fileBuffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: "audio/mpeg",
    });

  if (error) {
    console.error("Error uploading file:", error);
  }

  return data;
}
