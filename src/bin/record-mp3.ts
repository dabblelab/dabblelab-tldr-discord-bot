import "dotenv/config";
import fs from "fs";
import path from "path";
import OpenAI from "openai";

const openai = new OpenAI();

const speechFile = path.resolve("./files/welcome.mp3");

async function main() {
  const mp3 = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input:
      "Thank you for subscribing and welcome to the podcast. Every midnight we are going to publish a summary of the discussions happening on the discord server. Stay tuned for more updates.",
  });
  console.log(speechFile);
  const buffer = Buffer.from(await mp3.arrayBuffer());
  await fs.promises.writeFile(speechFile, buffer);
}
main();
