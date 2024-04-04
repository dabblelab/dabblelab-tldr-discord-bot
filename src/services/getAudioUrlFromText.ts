import { uploadFileToSupabase } from "./fileUpload";
import getTextToSpeech from "./textToSpeech";

export async function getAudioUrlFromText(text: string = "") {
  const audioFileBuffer = await getTextToSpeech(text);
  if (!audioFileBuffer) throw new Error("Could not generate audio file");

  // store the file to supabase
  const timestamp = new Date().getTime();

  const { path } = await uploadFileToSupabase({
    fileName: `summary_${timestamp}.mp3`,
    fileBuffer: audioFileBuffer,
  });

  if (!path) throw new Error("Could not upload file to supabase");

  const fileURL = `${process.env.SUPABASE_BUCKET_FOLDER_LOCATION}/${path}`;
  return fileURL;
}
