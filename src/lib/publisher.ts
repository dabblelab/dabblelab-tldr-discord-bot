import type {
  Client,
  TextChannel,
  Message,
  FetchMessagesOptions,
} from "discord.js";
import { getSubscribedChannels } from "./podcast";
import { prisma } from "./db";
import { Podcast } from "podcast";
import { uploadXmlFile, uploadAudio } from "./supabase";
import getTextToSpeech from "../services/textToSpeech";
import { getChatSummaryOfHistory } from "./langchain";

const MESSAGE_LIMIT = 100;
const MAX_MESSAGE_LIMIT = 500;

interface DiscordContext {
  messageLimit: number;
  chatHistory: string;
  channelName: string;
  date: string;
  channelId: string;
  guildId: string;
}

export async function publishWelcomeMessage(
  client: Client,
  publishChannelId: string | null,
) {
  try {
    const channels = publishChannelId
      ? [{ channelId: publishChannelId }]
      : (await getSubscribedChannels()) || [];

    const channelIterator = {
      channels: channels,
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
        const channelLicense = await prisma.license.findFirst({
          where: { channelId },
        });
        if (!channelPodcast || !channelLicense) {
          console.log("Records not found.");
          continue;
        }
        const guildId = channelLicense.guildId;

        console.log("Creating audio");
        const summary = `Thank you for subscribing and welcome to the podcast. Every midnight we are going to publish a summary of the discussions happening on the discord server. Stay tuned for more updates.`;
        const today = new Date(Date.now()).toLocaleDateString();
        const title = `Summary for ${today}`;
        const filePath = `${guildId}/${channelId}`;
        const audioURL = await getAudioUrlFromText(`${summary}`, filePath);
        console.log("Audio URL", audioURL);

        // Update Podcast Episode
        await createEpisode(channelId, title, summary as string, audioURL);
        await updatePodcastXml(channelId, guildId);

        console.log("Podcast published for channel", channel.name);
        console.log("\n");
      } else {
        console.log("Channel not found in cache", channelId);
      }
    }
  } catch (e) {
    console.log((e as Error).message);
    return `Could not generate summary due to error: ${(e as Error).message} `;
  }
}

export async function publishPodcasts(
  client: Client,
  publishChannelId: string | null,
) {
  const currentTime = new Date().toLocaleString();
  console.log("\nPublishing podcasts...", currentTime);
  const messageLimit: number = MESSAGE_LIMIT;

  const channels = publishChannelId
    ? [{ channelId: publishChannelId }]
    : (await getSubscribedChannels()) || [];

  const channelIterator = {
    channels: channels,
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

      const messages: Map<string, Message> = await fetchMessagesForChannel(
        channel,
        channelPodcast?.lastMessageId || null,
      );
      console.log("Channel", channel.name, "has", messages.size, "messages");

      if (messages.size === 0) {
        console.log("No new messages to publish");
        continue;
      }

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
  let lastMessageId = null;

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
    lastMessageId = messages.last()?.id;

    hasMore = messages.size === MESSAGE_LIMIT;
  }

  if (!allMessages.size) {
    return new Map();
  }

  // Save the first message ID after fetching
  const [firstMessageId] = allMessages.keys();
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
    const summary = await getChatSummaryOfHistory(discordContext.chatHistory);
    const today = new Date(Date.now()).toLocaleDateString();
    const title = `Summary for ${today}`;

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
