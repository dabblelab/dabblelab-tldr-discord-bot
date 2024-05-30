import OpenAI from "openai";

const openai = new OpenAI();

export async function createImageWithAi(title: string, description: string) {
  const response = await openai.images.generate({
    model: "dall-e-3",
    prompt: `Create a square logo for a podcast with title = ${title} AND description = ${description}`,
    n: 1,
    size: "1024x1024",
  });
  const imageUrl = response.data[0].url;
  return imageUrl;
}

export async function getTextToSpeech(
  text: string,
): Promise<Buffer | undefined> {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    return buffer;
  } catch (err) {
    console.error(err.message || err);
  }
}
