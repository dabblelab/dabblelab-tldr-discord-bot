import type { Podcast } from "@prisma/client";
import type {
  Client,
  FetchMessagesOptions,
  Message,
  TextChannel,
} from "discord.js";
import { Podcast as PodcastFeed } from "podcast";

import { getTextToSpeech } from "./ai";
import { prisma } from "./db";
import { getChatSummaryOfHistory } from "./langchain";
import { createPodcastEpisode, getSubscribedPodcasts } from "./podcast";
import { uploadAudio, uploadXmlFile } from "./supabase";
import { formatDateSummary } from "./utils";

const MESSAGE_LIMIT = 100;
const MAX_MESSAGE_LIMIT = 150;

interface DiscordContext {
  podcast: Podcast;
  messageLimit: number;
  chatHistory: string;
  channelName: string;
  date: string;
  channelId: string;
  guildId: string;
}

export async function publishPodcasts(
  client: Client,
  podcasts: Podcast[],
  useDefaultMessageIfNoHistory: boolean = false,
) {
  const currentTime = new Date().toLocaleString();
  console.log("\nPublishing podcasts...", currentTime);
  const messageLimit: number = MESSAGE_LIMIT;

  const allPodcasts =
    Array.isArray(podcasts) && podcasts.length
      ? podcasts
      : (await getSubscribedPodcasts()) || [];

  const podcastIterator = {
    podcasts: allPodcasts,
    *[Symbol.asyncIterator]() {
      for (const podcast of this.podcasts) {
        yield podcast;
      }
    },
  };
  console.log("Got podcasts", podcastIterator.podcasts.length);

  for await (const podcast of podcastIterator) {
    const podcastId = podcast.id;
    const channelId = podcast.channelId;
    console.log(
      "\n=== Starting with Podcast",
      podcastId,
      "and Channel",
      channelId,
    );
    const cachedChannel = client.channels.cache.get(channelId);

    if (cachedChannel && cachedChannel.isTextBased()) {
      const channel = cachedChannel as TextChannel;
      console.log("Channel found in cache", channel.id, channel.name);

      // FIXME: check if lastMessageId exist
      let messages: Map<string, Message> = new Map();
      try {
        messages = await fetchMessagesForChannel(
          channel,
          podcast?.lastMessageId || null,
        );
      } catch (e) {
        console.log((e as Error).message);
        continue;
      }
      console.log("Channel", podcast.channel, "has", messages.size, "messages");

      if (messages.size === 0 && useDefaultMessageIfNoHistory === false) {
        console.log("No new messages to publish");
        continue;
      }

      let chatHistory = "";
      if (messages.size === 0 && useDefaultMessageIfNoHistory === true) {
        chatHistory = `Thank you for subscribing and welcome to the podcast. Every midnight we are going to publish a summary of the discussions happening on the discord server. Stay tuned for more updates.`;
      } else {
        chatHistory += "<chat_history>\n";
        messages.forEach((message) => {
          if (message.author.id === client?.user?.id) return; // ignore bot messages (including this one
          if (!message.content && message.attachments.size === 0) return;

          chatHistory += `${
            message.author.displayName || message.author.username
          }: ${
            message.attachments.size > 0
              ? message.attachments?.first()?.proxyURL
              : message.content
          }\n`;
        });
        chatHistory += "</chat_history>";
      }

      const channelName = channel?.name || "";
      const date = new Date()
        .toISOString()
        .replace(/T/, " ")
        .replace(/\..+/, "");

      await getAIResponse({
        podcast: podcast,
        messageLimit: messageLimit as number,
        chatHistory,
        channelName,
        date,
        channelId,
        guildId: channel.guild.id,
      });

      console.log("Podcast published for channel", channel.name);
      console.log("\n");
    } else {
      console.log("Channel not found in cache", channelId);
    }
  }
}

async function fetchMessagesForChannel(
  channel: TextChannel,
  prevDiscussionId: string | null,
): Promise<Map<string, Message>> {
  const allMessages: Map<string, Message> = new Map();
  let hasMore = true;
  let lastMessageId: string | null = null;

  while (hasMore && allMessages.size < MAX_MESSAGE_LIMIT) {
    console.log(`Fetching ${MESSAGE_LIMIT} messages`);
    const messageOptions: FetchMessagesOptions = { limit: MESSAGE_LIMIT };
    if (lastMessageId) {
      messageOptions.before = lastMessageId;
    }
    if (prevDiscussionId) {
      messageOptions.after = prevDiscussionId;
    }
    const messages = await channel.messages.fetch(messageOptions);
    messages.forEach((message) => {
      // console.log(message.id, message.content);
      allMessages.set(message.id, message);
    });

    console.log("Received", messages.size, "messages. Total", allMessages.size);

    // const messageKeys = Array.from(messages.keys());
    lastMessageId = messages.last()?.id || null;

    hasMore = messages.size === MESSAGE_LIMIT;
  }

  if (!allMessages.size) {
    return new Map();
  }

  // Save the first message ID after fetching
  const allMessagesKeys = Array.from(allMessages.keys());
  const firstMessageId = allMessagesKeys[0];
  // const [firstMessageId] = allMessages.keys();
  await storeLastMessageId(channel.id, firstMessageId);

  // Return the messages in reverse order
  const reverseMessages = new Map(Array.from(allMessages.entries()).reverse());
  return reverseMessages;
}

async function storeLastMessageId(channelId: string, lastMessageId: string) {
  console.log("Storing last message id", lastMessageId);
  await prisma.podcast.update({
    where: { channelId },
    data: { lastMessageId },
  });
}

export async function getAIResponse(discordContext: DiscordContext) {
  try {
    const today = formatDateSummary(new Date());
    const summary = await getChatSummaryOfHistory(
      discordContext.chatHistory,
      discordContext?.podcast?.title as string,
      today,
    );

    const title = `Summary for ${discordContext?.podcast?.title} on ${today}`;

    try {
      console.log("Creating audio");
      const filePath = `${discordContext.guildId}/${discordContext.channelId}`;
      const audioURL = await getAudioUrlFromText(`${summary}`, filePath);
      console.log("Audio URL", audioURL);
      // Update Podcast Episode
      await createPodcastEpisode(
        discordContext.podcast.id,
        discordContext.channelId,
        title,
        summary as string,
        audioURL,
      );
      await updatePodcastXml(
        discordContext.podcast.id,
        discordContext.channelId,
        discordContext.guildId,
      );
    } catch (e) {
      console.log((e as Error).message || e);
      return `${summary} `;
    }
  } catch (e) {
    console.log((e as Error).message);
    return `Could not generate summary due to error: ${(e as Error).message} `;
  }
}

async function getAudioUrlFromText(text: string = "", filePath: string = "") {
  const audioFileBuffer = await getTextToSpeech(text);
  if (!audioFileBuffer) throw new Error("Could not generate audio file");

  const timestamp = new Date().getTime();
  const data = await uploadAudio({
    bucketName: process.env.SUPABASE_BUCKET_NAME as string,
    filePath: filePath,
    fileName: `summary_${timestamp}`,
    fileBuffer: audioFileBuffer,
  });

  if (!data?.path) throw new Error("Could not upload file to supabase");

  const fileURL = `${process.env.SUPABASE_BUCKET_FOLDER_LOCATION}/${data?.path}`;
  return fileURL;
}

async function updatePodcastXml(
  podcastId: string,
  channelId: string,
  guildId: string,
) {
  console.log("Updating podcast XML for channel", channelId);
  const channelPath = `${guildId}/${channelId}`;
  const podcast = await prisma.podcast.findFirst({
    where: { id: podcastId },
    include: { Episode: true },
  });
  const episodes = podcast?.Episode || [];

  const podcastOptions = {
    title: podcast?.title as string,
    description: podcast?.description as string,
    feedUrl: podcast?.feedUrl as string,
    siteUrl: podcast?.siteUrl as string,
    language: "en",
    imageUrl: podcast?.imageUrl as string,
    author: podcast?.author as string,
    // itunesCategory: [{ text: "Education" }], // FIXME: Need real data
    ituneImage: podcast?.imageUrl as string,
    customelements: [
      { "podcast:locked": "no" },
      // { "podcast:guid": "some-guid" },
    ],
  };
  const feed = new PodcastFeed(podcastOptions);
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
    process.env.SUPABASE_BUCKET_NAME as string,
  );

  return podcast;
}
