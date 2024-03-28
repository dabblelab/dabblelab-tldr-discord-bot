import openai from "../lib/openai";
import fs from "fs";
import path from "path";

const speechFile = path.resolve("./speech/out.mp3");

async function getTextToSpeech(text: string, outputFile: string = speechFile) {
  try {
    const mp3 = await openai.audio.speech.create({
      model: "tts-1",
      voice: "alloy",
      input: text,
    });
    const buffer = Buffer.from(await mp3.arrayBuffer());
    await fs.promises.writeFile(outputFile, buffer);
  } catch (err) {
    console.error(err.message || err);
  }
}

export default getTextToSpeech;
