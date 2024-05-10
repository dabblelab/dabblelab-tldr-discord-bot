import type { Client, TextChannel, Message, Collection } from "discord.js";
import { getSubscribedChannels } from "./podcast";
import { PromptTemplate } from "@langchain/core/prompts";
import { ChatOpenAI } from "@langchain/openai";
import { prisma } from "./db";
import { Podcast } from "podcast";
import { uploadXmlFile, uploadAudio } from "./supabase";
import getTextToSpeech from "../services/textToSpeech";

interface DiscordContext {
  messageLimit: number;
  chatHistory: string;
  channelName: string;
  date: string;
  channelId: string;
  guildId: string;
}

export async function publishPodcasts(client: Client) {
  const currentTime = new Date().toLocaleString();
  console.log("\nPublishing podcasts...", currentTime);
  const messageLimit: number = 50;

  const channelIterator = {
    channels: (await getSubscribedChannels()) || [],
    *[Symbol.asyncIterator]() {
      for (const channel of this.channels) {
        yield channel?.channelId;
      }
    },
  };
  console.log("Got channels", channelIterator.channels.length);

  for await (const channelId of channelIterator) {
    const cachedChannel = client.channels.cache.get(channelId);

    if (cachedChannel && cachedChannel.isTextBased()) {
      const channel = cachedChannel as TextChannel;

      // Check if Podcast is published or not
      const channelPodcast = await prisma.podcast.findFirst({
        where: { channelId },
      });
      if (!channelPodcast) {
        console.log(
          "Podcast record not available. Skipping to create XML file.",
        );
        continue;
      }

      const messages: Collection<string, Message> =
        await channel.messages.fetch({
          limit: messageLimit,
        });

      console.log("Channel", channel.name, "has", messages.size, "messages");

      messages.reverse();

      let chatHistory = "<chat_history>\n";
      messages.forEach((message) => {
        if (message.author.id === client.user.id) return; // ignore bot messages (including this one
        if (!message.content && message.attachments.size === 0) return;

        chatHistory += `${
          message.author.displayName || message.author.username
        }: ${
          message.attachments.size > 0
            ? message.attachments.first().proxyURL
            : message.content
        }\n`;
      });
      chatHistory += "</chat_history>";

      const channelName = channel?.name || "";
      const date = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      await getAIResponse({
        messageLimit: messageLimit as number,
        chatHistory,
        channelName,
        date,
        channelId,
        guildId: channel.guild.id,
      });

      console.log("Podcast published for channel", channel.name);
      console.log("\n");
    }
  }
}

export async function getAIResponse(discordContext: DiscordContext) {
  try {
    const model = new ChatOpenAI({
      modelName: "gpt-4",
      temperature: 0.5,
    });

    const promptTemplate = PromptTemplate.fromTemplate(
      `Create a summary of a chat conversation in the form of a numbered list. The user will enter a list of chats between two or more users. Your task is to return a summary such that a user can understand quickly what happened in the chat. The summary should be concise and capture the essence of the conversation. THE FINAL SUMMARY MUST NEVER EXCEED 4000 CHARACTERS.
      Following is the chat conversation between users:
      <chat_history>
        {input}
      </chat_history>`,
    );
    const chain = promptTemplate.pipe(model);
    console.log("Generating summary");
    const result = await chain.invoke({
      input: discordContext.chatHistory,
    });

    const summary = result.content;
    const title = `Summary of last ${discordContext.messageLimit} messages:`;

    try {
      console.log("Creating audio");
      const filePath = `${discordContext.guildId}/${discordContext.channelId}`;
      const audioURL = await getAudioUrlFromText(`${summary}`, filePath);
      console.log("Audio URL", audioURL);
      // Update Podcast Episode
      await createEpisode(
        discordContext.channelId,
        title,
        summary as string,
        audioURL,
      );
      await updatePodcastXml(discordContext.channelId, discordContext.guildId);
    } catch (e) {
      console.log((e as Error).message || e);
      return `${summary} `;
    }
  } catch (e) {
    console.log((e as Error).message);
    return `Could not generate summary due to error: ${(e as Error).message} `;
  }
}

async function createEpisode(
  channelId: string,
  title: string,
  summary: string,
  audioUrl: string,
) {
  console.log("Creating episode for podcast", channelId);
  const podcast = await prisma.podcast.findFirst({ where: { channelId } });

  if (podcast?.id) {
    await prisma.episode.create({
      data: {
        title,
        summary,
        podcastId: podcast?.id,
        audioUrl,
      },
    });
  } else {
    console.log("Unable to create podcast episode as podcast is not present.");
  }
}

async function getAudioUrlFromText(text: string = "", filePath: string = "") {
  const audioFileBuffer = await getTextToSpeech(text);
  if (!audioFileBuffer) throw new Error("Could not generate audio file");

  const timestamp = new Date().getTime();
  const { path } = await uploadAudio({
    bucketName: process.env.SUPABASE_BUCKET_NAME,
    filePath: filePath,
    fileName: `summary_${timestamp}`,
    fileBuffer: audioFileBuffer,
  });

  if (!path) throw new Error("Could not upload file to supabase");

  const fileURL = `${process.env.SUPABASE_BUCKET_FOLDER_LOCATION}/${path}`;
  return fileURL;
}

async function updatePodcastXml(channelId: string, guildId: string) {
  console.log("Updating podcast XML for channel", channelId);
  const channelPath = `${guildId}/${channelId}`;
  const podcast = await prisma.podcast.findFirst({
    where: { channelId: channelId },
    include: { episodes: true },
  });
  const episodes = podcast?.episodes || [];

  const podcastOptions = {
    title: podcast?.title,
    description: podcast?.description,
    feedUrl: podcast?.feedUrl,
    siteUrl: podcast?.siteUrl,
    language: "en",
    imageUrl: podcast?.imageUrl,
    author: podcast?.author,
    // itunesCategory: [{ text: "Education" }], // FIXME: Need real data
    ituneImage: podcast?.imageUrl,
    customelements: [
      { "podcast:locked": "no" },
      // { "podcast:guid": "some-guid" },
    ],
  };
  const feed = new Podcast(podcastOptions);
  episodes.forEach((file) => {
    feed.addItem({
      title: file.title,
      description: file.summary,
      url: file.audioUrl,
      date: new Date(file.createdAt),
      enclosure: {
        url: file.audioUrl,
        type: "audio/mpeg",
      },
    });
  });

  const xml = feed.buildXml();
  await uploadXmlFile(
    xml,
    channelPath,
    "feed",
    process.env.SUPABASE_BUCKET_NAME,
  );

  return podcast;
}
