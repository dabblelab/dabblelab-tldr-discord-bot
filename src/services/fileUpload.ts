import { supabase } from "../lib/supabase";

export const BUCKET_NAME = "discord-bot-audio";
export const FOLDER_NAME = "audio";

export async function uploadFileToSupabase({
  fileName,
  fileBuffer,
}: {
  fileName: string;
  fileBuffer: Buffer;
}): Promise<{ path: string } | null> {
  // const file = new Blob([fileBuffer]);
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(`${FOLDER_NAME}/${fileName}`, fileBuffer, {
      cacheControl: "3600",
      upsert: true,
      contentType: "audio/mpeg",
    });

  if (error) {
    console.error("Error uploading file:", error);
  }

  return data;
}
